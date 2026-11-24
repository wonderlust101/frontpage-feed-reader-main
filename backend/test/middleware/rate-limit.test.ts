// perUserRateLimit on a tiny Express app whose fake auth reads the user id from an `X-User` header:
// the limit, the 429 body and X-Retry-After, separate counters per user, and the window resetting.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { errorHandler } from '../../src/middleware/error-handler';
import { perUserRateLimit } from '../../src/middleware/rate-limit';
import type { AuthSession } from '../../src/modules/auth/auth.types';

const LIMIT = 2;
const WINDOW_MS = 300;

let server: Server;
let baseUrl: string;

beforeAll(async () => {
    const app = express();
    app.use((req, res, next) => {
        res.locals.auth = { user: { id: req.get('x-user') } } as unknown as AuthSession;
        next();
    });
    app.get('/limited', perUserRateLimit({ limit: LIMIT, windowMs: WINDOW_MS, message: 'Slow down' }), (_req, res) => {
        res.sendStatus(204);
    });
    app.use(errorHandler);

    server = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

// One request to the limited route as `user`.
function hit(user: string) {
    return fetch(`${baseUrl}/limited`, { headers: { 'X-User': user } });
}

describe('perUserRateLimit', () => {
    test('allows `limit` requests, then answers 429 rate_limited with X-Retry-After in seconds', async () => {
        expect((await hit('ada')).status).toBe(204);
        expect((await hit('ada')).status).toBe(204);

        const limited = await hit('ada');
        expect(limited.status).toBe(429);
        expect(await limited.json()).toEqual({ error: { code: 'rate_limited', message: 'Slow down', retryable: true } });
        expect(Number(limited.headers.get('X-Retry-After'))).toBeGreaterThanOrEqual(1);
    });

    test('sends no RateLimit-* headers (CORS only exposes X-Retry-After)', async () => {
        const res = await hit('grace');
        expect(res.headers.get('RateLimit')).toBeNull();
        expect(res.headers.get('X-RateLimit-Limit')).toBeNull();
    });

    test("one user's limit doesn't affect another", async () => {
        for (let i = 0; i < LIMIT; i++) {
            await hit('alan');
        }
        expect((await hit('alan')).status).toBe(429);
        expect((await hit('barbara')).status).toBe(204);
    });

    test('allows requests again once the window has passed', async () => {
        for (let i = 0; i < LIMIT; i++) {
            await hit('linus');
        }
        expect((await hit('linus')).status).toBe(429);

        await Bun.sleep(WINDOW_MS + 100);
        expect((await hit('linus')).status).toBe(204);
    });
});
