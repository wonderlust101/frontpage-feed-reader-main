// Fetches feeds for the API and ingestion, at most FEED_HOST_MAX_CONCURRENT per host. Keeps the last good result per URL
// in a small LRU cache (a Map in use order), so an upstream 304 "not modified" can still be answered with a feed.

import type { FeedCacheValidators, FetchFeedResponse, NormalizedFeed } from '@frontpage/shared';
import { env } from '../../env';
import { BadGatewayError, TooManyRequestsError } from '../../errors';
import { createHostLimiter, decodeFeed, fetchFeed, normalizeFeed, parseFeedUrl, type FetchFeedResult } from '../../lib/feed';

export type NotModifiedResult = Extract<FetchFeedResult, { notModified: true }>;

export type FreshResult = Extract<FetchFeedResult, { notModified: false }>;

type Validators = Partial<FeedCacheValidators>;

type CacheEntry = { validators: FeedCacheValidators; feed: NormalizedFeed };

const CACHE_LIMIT = 200;

// How long a fetch waits for a free slot on its feed's host, and the wait we then suggest to the reader.
const HOST_WAIT_MS = 5_000;
const HOST_BUSY_RETRY_AFTER_SECONDS = 5;

const cache = new Map<string, CacheEntry>();

// Shared by every fetch in this process: the API, subscribing and the background refresh.
export const hostLimiter = createHostLimiter({
    maxConcurrent: env.FEED_HOST_MAX_CONCURRENT,
    minIntervalMs: env.FEED_HOST_MIN_INTERVAL_MS,
});

// Caches under both the requested and the final URL, so an unchanged feed is just a 304 answered from the cache.
export async function getFeed(input: string | undefined, clientValidators: Validators = {}): Promise<FetchFeedResponse> {
    const url = parseFeedUrl(input);
    const cached = recall(url.href);
    const validators = hasValidators(clientValidators) ? clientValidators : (cached?.validators ?? {});

    const result = await fetchUpstream(url, validators);

    if (!result.notModified)
        return answerFresh(url, result);

    const entry = cached ?? recall(result.finalUrl);

    if (entry)
        return answerNotModified(result, entry);

    // Upstream says the client's copy is current but we have none, so ask again without validators (if we sent any).
    const full = hasValidators(validators) ? await fetchUpstream(url, {}) : result;

    if (full.notModified)
        throw unexpectedNotModifiedError('without a cached copy');

    return answerFresh(url, full);
}

// Empties the feed cache; tests call it so one test's cached feed can't affect the next.
export function clearFeedCache() {
    cache.clear();
}

// Downloads the feed with the server's fetch settings, sending `validators` so an unchanged feed is a 304. Throws
// `rate_limited` (429) when its host has no free slot within HOST_WAIT_MS.
export async function fetchUpstream(url: URL, validators: Validators): Promise<FetchFeedResult> {
    const release = await hostLimiter.acquire(url.hostname, HOST_WAIT_MS);

    if (!release) {
        throw new TooManyRequestsError('rate_limited', `Too many requests to ${url.hostname} right now. Try again in a few seconds.`, {
            retryAfterSeconds: HOST_BUSY_RETRY_AFTER_SECONDS,
        });
    }

    try {
        return await fetchFeed(url, {
            ...validators,
            timeoutMs: env.FEED_FETCH_TIMEOUT_MS,
            userAgent: env.FEED_USER_AGENT,
            allowLoopback: env.FEED_ALLOW_LOOPBACK,
        });
    } finally {
        release();
    }
}

// A 304 we have no stored copy to answer with; `detail` says why.
export function unexpectedNotModifiedError(detail: string) {
    return new BadGatewayError('http_5xx', `The feed server answered 304 ${detail}`, { upstreamStatus: 304 });
}

export function readFetchedFeed(result: FreshResult, requestedUrl: string): NormalizedFeed {
    const xml = decodeFeed(result.bytes, result.contentType);

    return normalizeFeed(xml, { url: result.finalUrl, requestedUrl });
}

// A 304 may resend only some validators; the stored value stands for the rest.
export function keepUnsentValidators(sent: FeedCacheValidators, stored: FeedCacheValidators): FeedCacheValidators {
    return {
        etag: sent.etag ?? stored.etag,
        lastModified: sent.lastModified ?? stored.lastModified,
    };
}

// The cached entry for a URL (or undefined); reading it also marks it as most recently used.
function recall(key: string): CacheEntry | undefined {
    const entry = cache.get(key);

    if (entry)
        remember(key, entry);

    return entry;
}

function hasValidators(validators: Validators): boolean {
    return Boolean(validators.etag || validators.lastModified);
}

function answerFresh(requestedUrl: URL, result: FreshResult): FetchFeedResponse {
    const fetchedAt = new Date().toISOString();
    const feed = readFetchedFeed(result, requestedUrl.href);

    const entry = { validators: result.validators, feed };

    remember(requestedUrl.href, entry);
    remember(result.finalUrl, entry);

    return { feed, fetchedAt, notModified: false, cache: result.validators, redirect: result.redirect };
}

function answerNotModified(result: NotModifiedResult, entry: CacheEntry): FetchFeedResponse {
    const validators = keepUnsentValidators(result.validators, entry.validators);

    return { feed: entry.feed, fetchedAt: new Date().toISOString(), notModified: true, cache: validators, redirect: result.redirect };
}

// Saves an entry as most recently used and evicts the oldest past CACHE_LIMIT (a Map keeps insertion order, so the first key is the oldest).
function remember(key: string, entry: CacheEntry) {
    cache.delete(key);
    cache.set(key, entry);

    const oldestKey = cache.keys().next().value;

    if (cache.size > CACHE_LIMIT && oldestKey !== undefined)
        cache.delete(oldestKey);
}
