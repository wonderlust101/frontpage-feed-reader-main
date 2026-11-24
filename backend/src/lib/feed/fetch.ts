// Downloads one feed safely: 10s timeout, manual redirects, ETag/Last-Modified, decompression, size cap.
// SSRF: request-filtering-agent checks the IP of every connection actually opened (each redirect hop too),
// so a hostname can't pass a check and then connect to a private address (DNS rebinding).

import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { pipeline, type Readable, type Transform } from 'node:stream';
import zlib from 'node:zlib';
import { RequestFilteringHttpAgent, RequestFilteringHttpsAgent } from 'request-filtering-agent';
import type { FeedCacheValidators, FeedRedirect } from '@frontpage/shared';
import { HttpError, BadGatewayError, BadRequestError, GatewayTimeoutError, PayloadTooLargeError, isRetryableStatus } from '../../middleware/errors';
import { WEB_PROTOCOLS } from './urls';

export type FetchFeedOptions = Partial<FeedCacheValidators> & {
    timeoutMs?: number;
    userAgent?: string;
    maxRedirects?: number;
    maxBytes?: number;
    allowLoopback?: boolean;
};

type FetchedFrom = {
    finalUrl: string;
    redirect: FeedRedirect | null;
    validators: FeedCacheValidators;
};

export type FetchFeedResult =
    | (FetchedFrom & { notModified: true })
    | (FetchedFrom & {
        notModified: false;
        bytes: Uint8Array;
        contentType: string | null;
    });

type Agents = {
    http: http.Agent;
    https: https.Agent;
};

// What every request of one fetch shares: headers, SSRF-safe agents, and the timeout that covers all hops and the body.
type RequestContext = {
    headers: Record<string, string>;
    agents: Agents;
    signal: AbortSignal;
    timeoutMs: number;
};

// The response that ended the redirect chain, where it came from, and the redirect to report (null if there was none).
type Arrival = {
    res: IncomingMessage;
    url: URL;
    redirect: FeedRedirect | null;
};

export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_USER_AGENT = 'Frontpage/0.1 (RSS reader)';
const DEFAULT_MAX_REDIRECTS = 5;

const ACCEPT_ENCODING = 'gzip, deflate, br';
const ACCEPT = 'application/rss+xml, application/atom+xml, application/rdf+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5';
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const PERMANENT_REDIRECT_STATUSES = new Set([301, 308]);

const DECOMPRESSORS: Record<string, () => Transform> = {
    gzip: zlib.createGunzip,
    'x-gzip': zlib.createGunzip,
    deflate: zlib.createInflate,
    br: zlib.createBrotliDecompress,
};

const LOOPBACK = ['127.0.0.1', '::1'];
let publicAgents: Agents | undefined;
let loopbackAgents: Agents | undefined;

// Turns a user-typed feed URL into a URL (adding "https://" if needed); throws `invalid_url` if it's empty, invalid, not http(s) or has a password.
export function parseFeedUrl(input: string | undefined | null): URL {
    const raw = input?.trim();
    if (!raw) {
        throw new BadRequestError('invalid_url', 'A feed URL is required');
    }

    let url: URL;
    try {
        url = new URL(HAS_SCHEME.test(raw) ? raw : `https://${raw}`);
    } catch {
        throw new BadRequestError('invalid_url', `Not a valid URL: ${raw}`);
    }

    if (!WEB_PROTOCOLS.has(url.protocol)) {
        throw new BadRequestError('invalid_url', 'Only http and https URLs are supported');
    }
    if (url.username || url.password) {
        throw new BadRequestError('invalid_url', 'URLs with credentials are not allowed');
    }

    url.hash = '';
    return url;
}

// Downloads one feed: follows up to 5 redirects itself (to report permanent moves), sends ETag / Last-Modified so an unchanged feed is a 304,
// and enforces the timeout and size cap. Every failure is thrown as an HttpError with a code such as `timeout`, `http_4xx` or `blocked_url`.
export async function fetchFeed(input: string | URL, opts: FetchFeedOptions = {}): Promise<FetchFeedResult> {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        userAgent = DEFAULT_USER_AGENT,
        maxRedirects = DEFAULT_MAX_REDIRECTS,
        maxBytes = DEFAULT_MAX_BYTES,
        allowLoopback = false,
    } = opts;
    const ctx: RequestContext = {
        headers: requestHeaders(userAgent, opts),
        agents: agentsFor(allowLoopback),
        signal: AbortSignal.timeout(timeoutMs),
        timeoutMs,
    };
    const startUrl = typeof input === 'string' ? parseFeedUrl(input) : input;

    try {
        const { res, url, redirect } = await followRedirects(startUrl, ctx, maxRedirects);
        const status = res.statusCode ?? 0;
        const fetchedFrom: FetchedFrom = {
            finalUrl: url.href,
            redirect,
            validators: { etag: header(res, 'etag'), lastModified: header(res, 'last-modified') },
        };

        if (status === 304) {
            res.destroy();
            return { ...fetchedFrom, notModified: true };
        }

        if (status < 200 || status >= 300) {
            res.destroy();
            // 5xx, 408 (timeout) and 429 (rate limited) are worth retrying; other 4xx are not.
            throw new BadGatewayError(status >= 500 ? 'http_5xx' : 'http_4xx', `The feed server responded with ${status}`, {
                upstreamStatus: status,
                retryable: isRetryableStatus(status),
            });
        }

        const bytes = await readBody(res, maxBytes);
        return { ...fetchedFrom, notModified: false, bytes, contentType: header(res, 'content-type') };
    } catch (err) {
        // Connection errors were already mapped per hop in request(); this catches body, decompression and timeout errors.
        throw toFetchError(err, startUrl, ctx);
    }
}

// Sends the GET and follows redirects itself, up to `maxRedirects`, so a moved feed can be reported.
// The move counts as permanent only if every hop was (301 or 308).
async function followRedirects(startUrl: URL, ctx: RequestContext, maxRedirects: number): Promise<Arrival> {
    let url = startUrl;
    let allPermanent = true;

    for (let hops = 0; ; hops++) {
        const res = await request(url, ctx);
        const status = res.statusCode ?? 0;

        if (!REDIRECT_STATUSES.has(status)) {
            const redirect = hops > 0 ? { permanent: allPermanent, from: startUrl.href, to: url.href } : null;
            return { res, url, redirect };
        }

        res.destroy();
        if (hops === maxRedirects) {
            throw new BadGatewayError('network', 'Too many redirects', { retryable: false });
        }

        url = nextRedirectUrl(res, url);
        allPermanent &&= PERMANENT_REDIRECT_STATUSES.has(status);
    }
}

// The shared agents, created on first use: public addresses only, or loopback allowed too for tests.
function agentsFor(allowLoopback: boolean): Agents {
    return allowLoopback ? (loopbackAgents ??= createAgents(LOOPBACK)) : (publicAgents ??= createAgents([]));
}

// Creates keep-alive http/https agents that refuse private or reserved IPs, except the exact addresses in `allowIPAddressList`.
function createAgents(allowIPAddressList: string[]): Agents {
    return {
        http: new RequestFilteringHttpAgent({ keepAlive: true, allowIPAddressList }),
        https: new RequestFilteringHttpsAgent({ keepAlive: true, allowIPAddressList }),
    };
}

// The headers sent on every request: who we are, what we accept, and the last ETag / Last-Modified so an unchanged feed is a 304.
function requestHeaders(userAgent: string, validators: Partial<FeedCacheValidators>): Record<string, string> {
    const headers: Record<string, string> = {
        'User-Agent': userAgent,
        Accept: ACCEPT,
        'Accept-Encoding': ACCEPT_ENCODING,
    };

    if (validators.etag) {
        headers['If-None-Match'] = validators.etag;
    }
    if (validators.lastModified) {
        headers['If-Modified-Since'] = validators.lastModified;
    }

    return headers;
}

// Sends one GET and resolves once the response headers arrive; doesn't follow redirects (followRedirects does that).
// Connection errors are mapped here, where we still know which URL (which redirect hop) failed.
function request(url: URL, ctx: RequestContext) {
    const [client, agent] = url.protocol === 'https:' ? [https, ctx.agents.https] : [http, ctx.agents.http];

    return new Promise<IncomingMessage>((resolve, reject) => {
        client.get(url, { headers: ctx.headers, agent, signal: ctx.signal }, resolve).on('error', (err) => reject(toFetchError(err, url, ctx)));
    });
}

// Reads one response header as a string, or null if it's missing (Node gives repeated headers as an array).
function header(res: IncomingMessage, name: string): string | null {
    const value = res.headers[name];
    return (Array.isArray(value) ? value[0] : value) ?? null;
}

// Where a redirect response points, checked like the first URL: throws if the Location is missing, not http(s) or has a password.
function nextRedirectUrl(res: IncomingMessage, currentUrl: URL): URL {
    const location = header(res, 'location');
    if (!location) {
        throw new BadGatewayError('network', `Redirect (${res.statusCode}) without a Location header`);
    }

    const next = new URL(location, currentUrl);
    if (!WEB_PROTOCOLS.has(next.protocol)) {
        throw new BadRequestError('blocked_url', 'Redirected to an unsupported protocol');
    }
    if (next.username || next.password) {
        throw new BadRequestError('blocked_url', 'Redirected to a URL with credentials');
    }

    next.hash = '';
    return next;
}

// Reads the whole decompressed body; throws `too_large` as soon as it passes `maxBytes`, so huge responses and zip bombs can't fill memory.
async function readBody(res: IncomingMessage, maxBytes: number): Promise<Uint8Array> {
    const declared = Number(header(res, 'content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) {
        res.destroy();
        throw new PayloadTooLargeError('too_large', `Feed is larger than ${maxBytes} bytes`);
    }

    const body = decompress(res);
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of body as AsyncIterable<Buffer>) {
        total += chunk.byteLength;

        if (total > maxBytes) {
            body.destroy();
            res.destroy();
            throw new PayloadTooLargeError('too_large', `Feed is larger than ${maxBytes} bytes`);
        }

        chunks.push(chunk);
    }

    return new Uint8Array(Buffer.concat(chunks, total));
}

// The response body, decompressed: unlike fetch, node:http leaves gzip, deflate and brotli bodies compressed.
function decompress(res: IncomingMessage): Readable {
    const encoding = header(res, 'content-encoding')?.trim().toLowerCase() ?? '';
    const decoder = DECOMPRESSORS[encoding]?.();

    // pipeline() forwards errors and aborts from the response into the decoder.
    return decoder ? pipeline(res, decoder, () => {}) : res;
}

// Turns any error from a fetch into an HttpError: blocked address, timeout, unknown host, or another network failure.
function toFetchError(err: unknown, url: URL, ctx: RequestContext): HttpError {
    if (err instanceof HttpError) {
        return err;
    }

    // request-filtering-agent refuses private addresses with a plain Error, recognisable only by its message.
    if (err instanceof Error && /^DNS lookup .* is not allowed/.test(err.message)) {
        return new BadRequestError('blocked_url', 'That host is not allowed');
    }

    if (ctx.signal.aborted || (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError'))) {
        return new GatewayTimeoutError('timeout', `The feed took longer than ${ctx.timeoutMs / 1000}s to respond`);
    }

    if ((err as NodeJS.ErrnoException)?.code === 'ENOTFOUND') {
        return new BadGatewayError('network', `Could not resolve host ${url.hostname}`, { retryable: false });
    }

    return new BadGatewayError('network', `Could not reach the feed: ${(err as Error)?.message ?? 'unknown error'}`);
}
