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

export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT_ENCODING = 'gzip, deflate, br';
const ACCEPT = 'application/rss+xml, application/atom+xml, application/rdf+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5';
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const WEB_PROTOCOLS = new Set(['http:', 'https:']);

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
    const { timeoutMs = 10_000, userAgent = 'Frontpage/0.1 (RSS reader)', maxRedirects = 5, maxBytes = DEFAULT_MAX_BYTES, allowLoopback = false } = opts;
    const signal = AbortSignal.timeout(timeoutMs);
    const agents = agentsFor(allowLoopback);
    const headers = requestHeaders(userAgent, opts);
    const startUrl = typeof input === 'string' ? parseFeedUrl(input) : input;

    let url = startUrl;
    let redirectCount = 0;
    let allRedirectsPermanent = true;

    try {
        while (true) {
            const res = await request(url, headers, agents, signal);
            const status = res.statusCode ?? 0;

            if (REDIRECT_STATUSES.has(status)) {
                res.destroy();

                redirectCount++;
                if (redirectCount > maxRedirects) {
                    throw new BadGatewayError('network', 'Too many redirects', { retryable: false });
                }

                url = nextRedirectUrl(res, url);
                allRedirectsPermanent &&= PERMANENT_REDIRECT_STATUSES.has(status);
                continue;
            }

            const fetchedFrom: FetchedFrom = {
                finalUrl: url.href,
                redirect: redirectCount > 0 ? { permanent: allRedirectsPermanent, from: startUrl.href, to: url.href } : null,
                validators: { etag: header(res, 'etag'), lastModified: header(res, 'last-modified') },
            };

            if (status === 304) {
                res.destroy();
                return { ...fetchedFrom, notModified: true };
            }

            if (status < 200 || status >= 300) {
                res.destroy();
                throw httpError(status);
            }

            const bytes = await readBody(res, maxBytes);
            return { ...fetchedFrom, notModified: false, bytes, contentType: header(res, 'content-type') };
        }
    } catch (err) {
        throw toFetchError(err, url, signal, timeoutMs);
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

// Sends one GET and resolves once the response headers arrive; doesn't follow redirects (fetchFeed does that).
function request(url: URL, headers: Record<string, string>, agents: Agents, signal: AbortSignal) {
    const [client, agent] = url.protocol === 'https:' ? [https, agents.https] : [http, agents.http];

    return new Promise<IncomingMessage>((resolve, reject) => {
        client.get(url, { headers, agent, signal }, resolve).on('error', reject);
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

// The HttpError for a 4xx/5xx response: 5xx, 408 (timeout) and 429 (rate limited) are worth retrying, other 4xx are not.
function httpError(status: number): HttpError {
    return new BadGatewayError(status >= 500 ? 'http_5xx' : 'http_4xx', `The feed server responded with ${status}`, {
        upstreamStatus: status,
        retryable: isRetryableStatus(status),
    });
}

// Reads the whole decompressed body; throws `too_large` as soon as it passes `maxBytes`, so huge responses and zip bombs can't fill memory.
async function readBody(res: IncomingMessage, maxBytes: number): Promise<Uint8Array> {
    const declared = Number(header(res, 'content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) {
        res.destroy();
        throw tooLarge(maxBytes);
    }

    const body = decompress(res);
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of body as AsyncIterable<Buffer>) {
        total += chunk.byteLength;

        if (total > maxBytes) {
            body.destroy();
            res.destroy();
            throw tooLarge(maxBytes);
        }

        chunks.push(chunk);
    }

    return new Uint8Array(Buffer.concat(chunks, total));
}

// The error thrown when a feed is bigger than `maxBytes`.
function tooLarge(maxBytes: number): HttpError {
    return new PayloadTooLargeError('too_large', `Feed is larger than ${maxBytes} bytes`);
}

// The response body, decompressed: unlike fetch, node:http leaves gzip, deflate and brotli bodies compressed.
function decompress(res: IncomingMessage): Readable {
    const encoding = header(res, 'content-encoding')?.trim().toLowerCase() ?? '';
    const decoder = DECOMPRESSORS[encoding]?.();

    // pipeline() forwards errors and aborts from the response into the decoder.
    return decoder ? pipeline(res, decoder, () => {}) : res;
}

// Turns any error from a fetch into an HttpError: blocked address, timeout, unknown host, or another network failure.
function toFetchError(err: unknown, url: URL, signal: AbortSignal, timeoutMs: number): HttpError {
    if (err instanceof HttpError) {
        return err;
    }

    // request-filtering-agent refuses private addresses with a plain Error, recognisable only by its message.
    if (err instanceof Error && /^DNS lookup .* is not allowed/.test(err.message)) {
        return new BadRequestError('blocked_url', 'That host is not allowed');
    }

    if (signal.aborted || (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError'))) {
        return new GatewayTimeoutError('timeout', `The feed took longer than ${timeoutMs / 1000}s to respond`);
    }

    if ((err as NodeJS.ErrnoException)?.code === 'ENOTFOUND') {
        return new BadGatewayError('network', `Could not resolve host ${url.hostname}`, { retryable: false });
    }

    return new BadGatewayError('network', `Could not reach the feed: ${(err as Error)?.message ?? 'unknown error'}`);
}
