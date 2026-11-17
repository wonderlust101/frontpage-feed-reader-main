// Fetches feeds for the API. Keeps the last good result per URL in a small LRU cache (a Map in use order),
// so an upstream 304 "not modified" can still be answered with a feed.

import type { FeedCacheValidators, FetchFeedResponse, NormalizedFeed } from '@frontpage/shared';
import { env } from '../../env';
import { FeedError, decodeFeed, fetchFeed, normalizeFeed, parseFeedUrl } from '../../lib/feed';

type CacheEntry = { validators: FeedCacheValidators; feed: NormalizedFeed };

const CACHE_LIMIT = 200;
const cache = new Map<string, CacheEntry>();

/** Stores an entry as the most recently used, evicting the oldest past CACHE_LIMIT. */
function remember(key: string, entry: CacheEntry) {
    cache.delete(key);
    cache.set(key, entry);
    if (cache.size > CACHE_LIMIT) {
        cache.delete(cache.keys().next().value!);
    }
}

/** Reads an entry and marks it as recently used. */
function recall(key: string): CacheEntry | undefined {
    const entry = cache.get(key);
    if (entry) {
        remember(key, entry);
    }
    return entry;
}

/** Empties the cache (used between tests). */
export function clearFeedCache() {
    cache.clear();
}

/**
 * Fetches, decodes and normalizes one feed. Sends ETag/Last-Modified (the client's, or the last ones we
 * saw) and answers an upstream 304 from the in-memory cache.
 */
export async function getFeed(
    input: string | undefined,
    clientValidators: Partial<FeedCacheValidators> = {},
): Promise<FetchFeedResponse> {
    const url = parseFeedUrl(input);
    const key = url.href;
    const cached = recall(key);
    const clientSent = Boolean(clientValidators.etag || clientValidators.lastModified);
    const validators = clientSent ? clientValidators : (cached?.validators ?? {});

    const result = await fetchFeed(url, {
        ...validators,
        timeoutMs: env.FEED_FETCH_TIMEOUT_MS,
        userAgent: env.FEED_USER_AGENT,
        allowLoopback: env.FEED_ALLOW_LOOPBACK,
    });
    const fetchedAt = new Date().toISOString();

    if (result.notModified) {
        const entry = cached ?? recall(result.finalUrl);
        if (!entry) {
            // Upstream says "unchanged" for validators we have no feed for; refetch unconditionally.
            if (clientSent) {
                return getFeed(input, {});
            }
            throw new FeedError('http_5xx', 'The feed server answered 304 without a cached copy', {
                upstreamStatus: 304,
            });
        }
        const merged: FeedCacheValidators = {
            etag: result.validators.etag ?? entry.validators.etag,
            lastModified: result.validators.lastModified ?? entry.validators.lastModified,
        };
        return { feed: entry.feed, fetchedAt, notModified: true, cache: merged, redirect: result.redirect };
    }

    const xml = decodeFeed(result.bytes, result.contentType);
    const feed = normalizeFeed(xml, { url: result.finalUrl, requestedUrl: url.href });
    const entry = { validators: result.validators, feed };
    remember(key, entry);
    if (result.finalUrl !== key) {
        remember(result.finalUrl, entry);
    }

    return { feed, fetchedAt, notModified: false, cache: result.validators, redirect: result.redirect };
}
