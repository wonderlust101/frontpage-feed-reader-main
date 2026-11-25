// GET /api/fetch over HTTP. Tests run without a database, so nobody can be signed in: the route must answer 401 before
// reading the URL or fetching anything. Signed-in behavior is in feeds.controller.test.ts; the limit in rate-limit.test.ts.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { startFeedServer } from '../../helpers/feed-server';
import { startTestServer } from '../../helpers/test-server';

const UNAUTHORIZED = { error: { code: 'unauthorized', message: 'Sign in to continue', retryable: false } };

let api: Awaited<ReturnType<typeof startTestServer>>;
let upstream: ReturnType<typeof startFeedServer>;

beforeAll(async () => {
    api = await startTestServer();
    upstream = startFeedServer();
});

afterAll(async () => {
    await upstream.stop();
    await api.close();
});

// Calls GET /api/fetch signed out, with `query` as the query string.
function fetchSignedOut(query: string) {
    return fetch(`${api.url}/api/fetch${query}`);
}

describe('GET /api/fetch signed out', () => {
    test('→ 401 unauthorized', async () => {
        const res = await fetchSignedOut(`?url=${encodeURIComponent(`${upstream.url}/feed.xml`)}`);

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual(UNAUTHORIZED);
    });

    test('auth runs before validation: a missing or bad url is still 401, not 400', async () => {
        expect((await fetchSignedOut('')).status).toBe(401);
        expect((await fetchSignedOut('?url=http%3A%2F%2F')).status).toBe(401);
    });

    test('a signed-out caller never reaches the feed server or the rate limiter', async () => {
        const url = `${upstream.url}/signed-out.xml`;

        for (let i = 0; i < 35; i++)
            expect((await fetchSignedOut(`?url=${encodeURIComponent(url)}`)).status).toBe(401);

        expect(upstream.hits['/signed-out.xml']).toBeUndefined();
    });
});
