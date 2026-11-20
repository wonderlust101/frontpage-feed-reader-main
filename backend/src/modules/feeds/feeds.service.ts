// Fetches feeds for the API. Keeps the last good result per URL in a small LRU cache (a Map in use order),
// so an upstream 304 "not modified" can still be answered with a feed.

import type { FeedCacheValidators, FetchFeedResponse, NormalizedFeed } from '@frontpage/shared';
import { env } from '../../env';
import { BadGatewayError } from '../../middleware/errors';
import { decodeFeed, fetchFeed, normalizeFeed, parseFeedUrl, type FetchFeedResult } from '../../lib/feed';

type Validators = Partial<FeedCacheValidators>;
type NotModifiedResult = Extract<FetchFeedResult, { notModified: true }>;
type FreshResult = Extract<FetchFeedResult, { notModified: false }>;
type CacheEntry = { validators: FeedCacheValidators; feed: NormalizedFeed };

// Fetches, decodes and normalizes one feed for the API, caching it under both the requested and the final (after redirects) URL.
// Sends the client's ETag/Last-Modified, or the last ones we saw, so an unchanged feed is just a 304 answered from the cache.
export async function getFeed(input: string | undefined, clientValidators: Validators = {}): Promise<FetchFeedResponse> {
    const url = parseFeedUrl(input);
    const cached = recall(url.href);
    const validators = hasValidators(clientValidators) ? clientValidators : (cached?.validators ?? {});

    const result = await fetchUpstream(url, validators);
    if (!result.notModified) {
        return answerFresh(url, result);
    }

    const entry = cached ?? recall(result.finalUrl);
    if (entry) {
        return answerNotModified(result, entry);
    }

    // Upstream says the client's copy is current, but we have no copy to answer with: ask again without validators.
    if (!hasValidators(validators)) {
        throw notModifiedWithoutCopy();
    }
    const full = await fetchUpstream(url, {});
    if (full.notModified) {
        throw notModifiedWithoutCopy();
    }
    return answerFresh(url, full);
}

// Empties the feed cache; tests call it so one test's cached feed can't affect the next.
export function clearFeedCache() {
    cache.clear();
}

// Downloads the feed with the server's fetch settings, sending `validators` so an unchanged feed is a 304.
function fetchUpstream(url: URL, validators: Validators): Promise<FetchFeedResult> {
    return fetchFeed(url, {
        ...validators,
        timeoutMs: env.FEED_FETCH_TIMEOUT_MS,
        userAgent: env.FEED_USER_AGENT,
        allowLoopback: env.FEED_ALLOW_LOOPBACK,
    });
}

// A new copy of the feed: parse it, cache it under the requested and the final URL, and send it.
function answerFresh(requestedUrl: URL, result: FreshResult): FetchFeedResponse {
    const fetchedAt = new Date().toISOString();
    const xml = decodeFeed(result.bytes, result.contentType);
    const feed = normalizeFeed(xml, { url: result.finalUrl, requestedUrl: requestedUrl.href });

    const entry = { validators: result.validators, feed };
    remember(requestedUrl.href, entry);
    remember(result.finalUrl, entry);

    return { feed, fetchedAt, notModified: false, cache: result.validators, redirect: result.redirect };
}

// Upstream says nothing changed: send the cached feed, with upstream's validators where it sent new ones.
function answerNotModified(result: NotModifiedResult, entry: CacheEntry): FetchFeedResponse {
    const validators: FeedCacheValidators = {
        etag: result.validators.etag ?? entry.validators.etag,
        lastModified: result.validators.lastModified ?? entry.validators.lastModified,
    };

    return { feed: entry.feed, fetchedAt: new Date().toISOString(), notModified: true, cache: validators, redirect: result.redirect };
}

// True when there's an ETag or Last-Modified to send, i.e. the request will be conditional.
function hasValidators(validators: Validators): boolean {
    return Boolean(validators.etag || validators.lastModified);
}

// The error for an upstream 304 we can't answer, because neither we nor the request has the feed's content.
function notModifiedWithoutCopy() {
    return new BadGatewayError('http_5xx', 'The feed server answered 304 without a cached copy', { upstreamStatus: 304 });
}

// --- LRU cache of the last good result per URL ---

const CACHE_LIMIT = 200;
const cache = new Map<string, CacheEntry>();

// The cached entry for a URL (or undefined); reading it also marks it as most recently used.
function recall(key: string): CacheEntry | undefined {
    const entry = cache.get(key);

    if (entry) {
        remember(key, entry);
    }
    return entry;
}

// Saves an entry as most recently used and evicts the oldest past CACHE_LIMIT (a Map keeps insertion order, so the first key is the oldest).
function remember(key: string, entry: CacheEntry) {
    cache.delete(key);
    cache.set(key, entry);

    if (cache.size > CACHE_LIMIT) {
        cache.delete(cache.keys().next().value!);
    }
}
