import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import type { FeedErrorResponse, FetchFeedResponse } from '@frontpage/shared';
import { clearFeedCache } from '../../../src/modules/feeds/feeds.service';
import { startTestServer } from '../../helpers/test-server';
import { ETAG, LAST_MODIFIED, startFeedServer } from '../../helpers/feed-server';

let api: Awaited<ReturnType<typeof startTestServer>>;
let upstream: ReturnType<typeof startFeedServer>;

beforeAll(async () => {
    api = await startTestServer();
    upstream = startFeedServer();
});

afterAll(async () => {
    upstream.stop();
    await api.close();
});

beforeEach(() => {
    clearFeedCache();
});

// Calls GET /api/fetch for `feedUrl` (or with no `?url=` at all when it's null).
const fetchApi = (feedUrl: string | null, init?: RequestInit) =>
    fetch(`${api.url}/api/fetch${feedUrl === null ? '' : `?url=${encodeURIComponent(feedUrl)}`}`, init);

describe('GET /api/fetch', () => {
    test('returns a normalized feed as JSON', async () => {
        const res = await fetchApi(`${upstream.url}/feed.xml`);

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('cache-control')).toBe('public, max-age=300');

        const body = (await res.json()) as FetchFeedResponse;

        expect(body.notModified).toBe(false);
        expect(body.redirect).toBeNull();
        expect(Date.parse(body.fetchedAt)).not.toBeNaN();
        expect(body.feed).toMatchObject({ url: `${upstream.url}/feed.xml`, format: 'rss2', title: 'CDATA & Title' });
        expect(body.feed.items[0]).toMatchObject({
            title: 'Full content item',
            author: 'Grace Hopper',
            publishedAt: '2025-06-10T09:00:00.000Z',
            hasFullContent: true,
        });
    });

    test('decodes the charset from the upstream Content-Type', async () => {
        const body = (await (await fetchApi(`${upstream.url}/latin1.xml`)).json()) as FetchFeedResponse;

        expect(body.feed.items[0]?.title).toBe('Grüße aus München');
    });

    test('reports redirects and the final URL', async () => {
        const body = (await (await fetchApi(`${upstream.url}/moved-permanently`)).json()) as FetchFeedResponse;

        expect(body.feed.url).toBe(`${upstream.url}/feed.xml`);
        expect(body.feed.requestedUrl).toBe(`${upstream.url}/moved-permanently`);
        expect(body.redirect).toMatchObject({ permanent: true, to: `${upstream.url}/feed.xml` });
    });

    test('echoes upstream validators and reuses them on the next fetch', async () => {
        const first = await fetchApi(`${upstream.url}/cached.xml`);

        expect(first.headers.get('etag')).toBe(ETAG);
        expect(first.headers.get('last-modified')).toBe(LAST_MODIFIED);
        const firstBody = (await first.json()) as FetchFeedResponse;

        expect(firstBody.cache).toEqual({ etag: ETAG, lastModified: LAST_MODIFIED });

        const second = await fetchApi(`${upstream.url}/cached.xml`);

        expect(second.status).toBe(200);
        const secondBody = (await second.json()) as FetchFeedResponse;

        expect(secondBody.notModified).toBe(true);
        expect(secondBody.feed).toEqual(firstBody.feed);
        expect(upstream.lastHeaders['/cached.xml']?.get('if-none-match')).toBe(ETAG);
    });

    test('answers 304 when the client already has the current version', async () => {
        await fetchApi(`${upstream.url}/cached.xml`);
        const res = await fetchApi(`${upstream.url}/cached.xml`, { headers: { 'If-None-Match': ETAG } });

        expect(res.status).toBe(304);
        expect(upstream.lastHeaders['/cached.xml']?.get('if-none-match')).toBe(ETAG);
    });

    test('a stale client validator gets the full feed', async () => {
        const res = await fetchApi(`${upstream.url}/cached.xml`, { headers: { 'If-None-Match': '"stale"' } });

        expect(res.status).toBe(200);
        expect(((await res.json()) as FetchFeedResponse).notModified).toBe(false);
    });

    test('refetches unconditionally when upstream says 304 but the server has no cached copy', async () => {
        const before = upstream.hits['/cached.xml'] ?? 0;
        const res = await fetchApi(`${upstream.url}/cached.xml`, { headers: { 'If-None-Match': ETAG } });

        // Two upstream requests: the conditional one (304) and the full refetch.
        expect((upstream.hits['/cached.xml'] ?? 0) - before).toBe(2);
        expect(res.status).toBe(304);
    });

    test.each([
        ['a missing url', null, 400, 'invalid_url', false],
        ['an invalid url', 'http://', 400, 'invalid_url', false],
        ['a web page', '/html', 422, 'not_a_feed', false],
        ['a 404', '/missing', 502, 'http_4xx', false],
        ['a 500', '/error', 502, 'http_5xx', true],
        ['a timeout', '/slow', 504, 'timeout', true],
    ] as const)('maps %s to %i %s', async (_label, path, status, code, retryable) => {
        const target = path === null ? null : path.startsWith('/') ? `${upstream.url}${path}` : path;
        const res = await fetchApi(target);

        expect(res.status).toBe(status);
        const body = (await res.json()) as FeedErrorResponse;

        expect(body.error.code).toBe(code);
        expect(body.error.retryable).toBe(retryable);
        expect(body.error.message).toBeString();
    });
});
