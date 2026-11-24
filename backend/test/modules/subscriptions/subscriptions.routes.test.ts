// /api/subscriptions over HTTP. Tests run without a database, so nobody can be signed in: every route must answer
// 401 before reading the body or the id. Signed-in behaviour (ownership included) is in subscriptions.service.test.ts.
// (A body that isn't a JSON object or array is refused even earlier, by the app-wide express.json(), as 400 invalid_json.)

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { startTestServer } from '../../helpers/test-server';

const ID = '0b6f7e7c-3a4d-4f1e-9b8a-2c5d6e7f8a9b';
const UNAUTHORIZED = { error: { code: 'unauthorized', message: 'Sign in to continue', retryable: false } };

let server: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
    server = await startTestServer();
});

afterAll(async () => {
    await server.close();
});

// Sends `method` to /api/subscriptions + `path` with an optional JSON body, signed out.
function send(method: string, path: string, body?: unknown) {
    return fetch(`${server.url}/api/subscriptions${path}`, {
        method,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

describe('/api/subscriptions signed out', () => {
    test.each([
        ['GET', ''],
        ['POST', ''],
        ['PATCH', `/${ID}`],
        ['DELETE', `/${ID}`],
    ])('%s %s → 401 unauthorized', async (method, path) => {
        const res = await send(method, path, method === 'POST' || method === 'PATCH' ? { url: 'https://a.test/feed', customTitle: 'A' } : undefined);

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual(UNAUTHORIZED);
    });

    test('auth runs before validation: a bad body or id is still 401, not 400 or 404', async () => {
        expect((await send('POST', '', ['not', 'an', 'object'])).status).toBe(401);
        expect((await send('PATCH', '/not-a-uuid', {})).status).toBe(401);
        expect((await send('DELETE', '/not-a-uuid')).status).toBe(401);
    });

    test('a signed-out subscribe never reaches the feed server or the rate limiter', async () => {
        for (let i = 0; i < 35; i++) {
            expect((await send('POST', '', { url: 'https://a.test/feed' })).status).toBe(401);
        }
    });
});
