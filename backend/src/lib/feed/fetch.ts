import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { pipeline, type Readable } from 'node:stream';
import zlib from 'node:zlib';
import { RequestFilteringHttpAgent, RequestFilteringHttpsAgent } from 'request-filtering-agent';
import type { FeedCacheValidators, FeedRedirect } from '@frontpage/shared';
import { FeedError } from './errors';

export type FetchFeedOptions = Partial<FeedCacheValidators> & {
    timeoutMs?: number;
    userAgent?: string;
    maxRedirects?: number;
    maxBytes?: number;
    /** Allow loopback addresses (127.0.0.1, ::1) so tests can reach a local server. Every other non-public range stays blocked. */
    allowLoopback?: boolean;
};

export type FetchFeedResult =
    | { notModified: true; finalUrl: string; redirect: FeedRedirect | null; validators: FeedCacheValidators }
    | {
          notModified: false;
          bytes: Uint8Array;
          contentType: string | null;
          finalUrl: string;
          redirect: FeedRedirect | null;
          validators: FeedCacheValidators;
      };

export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT_ENCODING = 'gzip, deflate, br';
const ACCEPT =
    'application/rss+xml, application/atom+xml, application/rdf+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5';

/** Parses and validates a user-supplied feed URL. Throws `invalid_url`. */
export function parseFeedUrl(input: string | undefined | null): URL {
    const raw = input?.trim();
    if (!raw) {
        throw new FeedError('invalid_url', 'A feed URL is required');
    }
    let url: URL;
    try {
        url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    } catch {
        throw new FeedError('invalid_url', `Not a valid URL: ${raw}`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new FeedError('invalid_url', 'Only http and https URLs are supported');
    }
    if (url.username || url.password) {
        throw new FeedError('invalid_url', 'URLs with credentials are not allowed');
    }
    url.hash = '';
    return url;
}

// ── SSRF protection ─────────────────────────────────────────────
// request-filtering-agent validates the IP inside the DNS lookup of the socket that is actually
// opened (and IP literals before connecting), so a hostname can't pass a check and then connect
// somewhere else (DNS rebinding). Only ordinary public ("unicast") addresses are allowed, using
// ipaddr.js's range list. Every redirect hop is a new request through the same agent.
// Agents keep connections alive and are reused across fetches.

type Agents = { http: http.Agent; https: https.Agent };
const LOOPBACK = ['127.0.0.1', '::1'];
let publicAgents: Agents | undefined;
let loopbackAgents: Agents | undefined;

function createAgents(allowIPAddressList: string[]): Agents {
    return {
        http: new RequestFilteringHttpAgent({ keepAlive: true, allowIPAddressList }),
        https: new RequestFilteringHttpsAgent({ keepAlive: true, allowIPAddressList }),
    };
}

function agentsFor(allowLoopback: boolean): Agents {
    return allowLoopback ? (loopbackAgents ??= createAgents(LOOPBACK)) : (publicAgents ??= createAgents([]));
}

/** request-filtering-agent rejects with a plain Error whose message says the address "is not allowed". */
function isBlockedAddressError(err: unknown): boolean {
    return err instanceof Error && /^DNS lookup .* is not allowed/.test(err.message);
}

/** One GET request (no redirect following), resolved once response headers arrive. */
function request(url: URL, headers: Record<string, string>, agents: Agents, signal: AbortSignal) {
    const [client, agent] = url.protocol === 'https:' ? [https, agents.https] : [http, agents.http];
    return new Promise<IncomingMessage>((resolve, reject) => {
        client.get(url, { headers, agent, signal }, resolve).on('error', reject);
    });
}

const header = (res: IncomingMessage, name: string): string | null => {
    const value = res.headers[name];
    return (Array.isArray(value) ? value[0] : value) ?? null;
};

/** node:http doesn't decompress like fetch does, so undo Content-Encoding here. */
function decompress(res: IncomingMessage): Readable {
    const encoding = header(res, 'content-encoding')?.trim().toLowerCase();
    const decoder =
        encoding === 'gzip' || encoding === 'x-gzip'
            ? zlib.createGunzip()
            : encoding === 'deflate'
              ? zlib.createInflate()
              : encoding === 'br'
                ? zlib.createBrotliDecompress()
                : null;
    // pipeline() forwards errors and aborts from the response into the decoder.
    return decoder ? pipeline(res, decoder, () => {}) : res;
}

/** Reads the (decompressed) body, failing as soon as it exceeds maxBytes — which also stops zip bombs. */
async function readBody(res: IncomingMessage, maxBytes: number): Promise<Uint8Array> {
    const declared = Number(header(res, 'content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) {
        res.destroy();
        throw new FeedError('too_large', `Feed is larger than ${maxBytes} bytes`);
    }
    const body = decompress(res);
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of body as AsyncIterable<Buffer>) {
        total += chunk.byteLength;
        if (total > maxBytes) {
            body.destroy();
            res.destroy();
            throw new FeedError('too_large', `Feed is larger than ${maxBytes} bytes`);
        }
        chunks.push(chunk);
    }
    return new Uint8Array(Buffer.concat(chunks, total));
}

function isAbort(err: unknown): boolean {
    return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
}

/**
 * Fetches a feed with a hard timeout (covering redirects and the body), manual redirect following
 * (so permanent moves are reported), SSRF protection on every connection, conditional request
 * headers, decompression and a body size cap.
 */
export async function fetchFeed(input: string | URL, opts: FetchFeedOptions = {}): Promise<FetchFeedResult> {
    const {
        timeoutMs = 10_000,
        userAgent = 'Frontpage/0.1 (RSS reader)',
        maxRedirects = 5,
        maxBytes = DEFAULT_MAX_BYTES,
        allowLoopback = false,
    } = opts;
    const signal = AbortSignal.timeout(timeoutMs);
    const agents = agentsFor(allowLoopback);
    const startUrl = typeof input === 'string' ? parseFeedUrl(input) : input;

    let url = startUrl;
    let permanent = true;
    let hops = 0;

    try {
        for (;;) {
            const headers: Record<string, string> = {
                'User-Agent': userAgent,
                Accept: ACCEPT,
                'Accept-Encoding': ACCEPT_ENCODING,
            };
            if (opts.etag) {
                headers['If-None-Match'] = opts.etag;
            }
            if (opts.lastModified) {
                headers['If-Modified-Since'] = opts.lastModified;
            }

            const res = await request(url, headers, agents, signal);
            const status = res.statusCode ?? 0;

            if ([301, 302, 303, 307, 308].includes(status)) {
                res.destroy();
                const location = header(res, 'location');
                if (!location) {
                    throw new FeedError('network', `Redirect (${status}) without a Location header`);
                }
                if (++hops > maxRedirects) {
                    throw new FeedError('network', 'Too many redirects', { retryable: false });
                }
                const next = new URL(location, url);
                if (next.protocol !== 'http:' && next.protocol !== 'https:') {
                    throw new FeedError('blocked_url', 'Redirected to an unsupported protocol');
                }
                // Same rule as the first URL: no user:pass@ (node:http would send it as an Authorization header).
                if (next.username || next.password) {
                    throw new FeedError('blocked_url', 'Redirected to a URL with credentials');
                }
                next.hash = '';
                if (status !== 301 && status !== 308) {
                    permanent = false;
                }
                url = next;
                continue;
            }

            const redirect: FeedRedirect | null = hops > 0 ? { permanent, from: startUrl.href, to: url.href } : null;
            const validators: FeedCacheValidators = {
                etag: header(res, 'etag'),
                lastModified: header(res, 'last-modified'),
            };

            if (status === 304) {
                res.destroy();
                return { notModified: true, finalUrl: url.href, redirect, validators };
            }
            if (status < 200 || status >= 300) {
                res.destroy();
                const code = status >= 500 ? 'http_5xx' : 'http_4xx';
                const retryable = status >= 500 || status === 429 || status === 408;
                throw new FeedError(code, `The feed server responded with ${status}`, {
                    upstreamStatus: status,
                    retryable,
                });
            }

            const bytes = await readBody(res, maxBytes);
            return {
                notModified: false,
                bytes,
                contentType: header(res, 'content-type'),
                finalUrl: url.href,
                redirect,
                validators,
            };
        }
    } catch (err) {
        if (err instanceof FeedError) {
            throw err;
        }
        if (isBlockedAddressError(err)) {
            throw new FeedError('blocked_url', 'That host is not allowed');
        }
        if (isAbort(err) || signal.aborted) {
            throw new FeedError('timeout', `The feed took longer than ${timeoutMs / 1000}s to respond`);
        }
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code === 'ENOTFOUND') {
            throw new FeedError('network', `Could not resolve host ${url.hostname}`, { retryable: false });
        }
        throw new FeedError('network', `Could not reach the feed: ${(err as Error)?.message ?? 'unknown error'}`);
    }
}
