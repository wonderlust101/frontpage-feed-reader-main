import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { FeedCacheValidators, FeedRedirect } from '@frontpage/shared';
import { FeedError } from './errors';

export type FetchFeedOptions = Partial<FeedCacheValidators> & {
    timeoutMs?: number;
    userAgent?: string;
    maxRedirects?: number;
    maxBytes?: number;
    /** Allow loopback/private addresses. Only for tests. */
    allowPrivate?: boolean;
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
const ACCEPT =
    'application/rss+xml, application/atom+xml, application/rdf+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5';

/** Parses and validates a user-supplied feed URL. Throws `invalid_url`. */
export function parseFeedUrl(input: string | undefined | null): URL {
    const raw = input?.trim();
    if (!raw) throw new FeedError('invalid_url', 'A feed URL is required');
    let url: URL;
    try {
        url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    } catch {
        throw new FeedError('invalid_url', `Not a valid URL: ${raw}`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new FeedError('invalid_url', 'Only http and https URLs are supported');
    }
    if (url.username || url.password) throw new FeedError('invalid_url', 'URLs with credentials are not allowed');
    url.hash = '';
    return url;
}

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
    if (isIP(ip) === 4) {
        const [a = 0, b = 0] = ip.split('.').map(Number);
        return (
            a === 0 ||
            a === 10 ||
            a === 127 ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            (a === 198 && (b === 18 || b === 19)) ||
            a >= 224
        );
    }
    const v6 = ip.toLowerCase();
    if (v6 === '::' || v6 === '::1') return true;
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    return /^(fc|fd|fe[89ab]|ff)/.test(v6);
}

async function assertPublicHost(url: URL): Promise<void> {
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
        throw new FeedError('blocked_url', 'That host is not allowed');
    }
    let addresses: string[];
    if (isIP(host)) {
        addresses = [host];
    } else {
        try {
            addresses = (await lookup(host, { all: true })).map((a) => a.address);
        } catch {
            throw new FeedError('network', `Could not resolve host ${host}`, { retryable: false });
        }
    }
    if (addresses.some(isPrivateAddress)) throw new FeedError('blocked_url', 'That host is not allowed');
}

async function readBody(res: Response, maxBytes: number): Promise<Uint8Array> {
    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) {
        await res.body?.cancel();
        throw new FeedError('too_large', `Feed is larger than ${maxBytes} bytes`);
    }
    if (!res.body) return new Uint8Array();
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = res.body.getReader();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
            await reader.cancel();
            throw new FeedError('too_large', `Feed is larger than ${maxBytes} bytes`);
        }
        chunks.push(value);
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return out;
}

function isAbort(err: unknown): boolean {
    return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
}

/**
 * Fetches a feed with a hard timeout (covering redirects and the body), manual redirect following
 * (so permanent moves are reported and every hop is SSRF-checked), conditional request headers
 * and a body size cap.
 */
export async function fetchFeed(input: string | URL, opts: FetchFeedOptions = {}): Promise<FetchFeedResult> {
    const {
        timeoutMs = 10_000,
        userAgent = 'Frontpage/0.1 (RSS reader)',
        maxRedirects = 5,
        maxBytes = DEFAULT_MAX_BYTES,
        allowPrivate = false,
    } = opts;
    const signal = AbortSignal.timeout(timeoutMs);
    const startUrl = typeof input === 'string' ? parseFeedUrl(input) : input;

    let url = startUrl;
    let permanent = true;
    let hops = 0;

    try {
        for (;;) {
            if (!allowPrivate) await assertPublicHost(url);

            const headers: Record<string, string> = { 'User-Agent': userAgent, Accept: ACCEPT };
            if (opts.etag) headers['If-None-Match'] = opts.etag;
            if (opts.lastModified) headers['If-Modified-Since'] = opts.lastModified;

            const res = await fetch(url, { headers, redirect: 'manual', signal });

            if ([301, 302, 303, 307, 308].includes(res.status)) {
                await res.body?.cancel();
                const location = res.headers.get('location');
                if (!location) throw new FeedError('network', `Redirect (${res.status}) without a Location header`);
                if (++hops > maxRedirects) throw new FeedError('network', 'Too many redirects', { retryable: false });
                const next = new URL(location, url);
                if (next.protocol !== 'http:' && next.protocol !== 'https:') {
                    throw new FeedError('blocked_url', 'Redirected to an unsupported protocol');
                }
                if (res.status !== 301 && res.status !== 308) permanent = false;
                url = next;
                continue;
            }

            const redirect: FeedRedirect | null = hops > 0 ? { permanent, from: startUrl.href, to: url.href } : null;
            const validators: FeedCacheValidators = {
                etag: res.headers.get('etag'),
                lastModified: res.headers.get('last-modified'),
            };

            if (res.status === 304) {
                await res.body?.cancel();
                return { notModified: true, finalUrl: url.href, redirect, validators };
            }
            if (!res.ok) {
                await res.body?.cancel();
                const code = res.status >= 500 ? 'http_5xx' : 'http_4xx';
                const retryable = res.status >= 500 || res.status === 429 || res.status === 408;
                throw new FeedError(code, `The feed server responded with ${res.status}`, {
                    status: res.status,
                    retryable,
                });
            }

            const bytes = await readBody(res, maxBytes);
            return {
                notModified: false,
                bytes,
                contentType: res.headers.get('content-type'),
                finalUrl: url.href,
                redirect,
                validators,
            };
        }
    } catch (err) {
        if (err instanceof FeedError) throw err;
        if (isAbort(err) || signal.aborted) {
            throw new FeedError('timeout', `The feed took longer than ${timeoutMs / 1000}s to respond`);
        }
        throw new FeedError('network', `Could not reach the feed: ${(err as Error)?.message ?? 'unknown error'}`);
    }
}
