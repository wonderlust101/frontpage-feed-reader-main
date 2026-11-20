// /api/auth/* when the API has no database (the test setup blanks DATABASE_URL): every auth endpoint answers 503.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { startTestServer } from '../../helpers/test-server';

let server: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
    server = await startTestServer();
});

afterAll(async () => {
    await server.close();
});

describe('/api/auth without a database', () => {
    test('sign-up answers 503 database_unavailable', async () => {
        const res = await fetch(`${server.url}/api/auth/sign-up/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'a@example.com', password: 'long enough', name: 'A' }),
        });
        expect(res.status).toBe(503);
        expect(await res.json()).toEqual({
            error: { code: 'database_unavailable', message: 'Accounts are unavailable: the API has no database', retryable: true },
        });
    });

    test('get-session answers 503 too', async () => {
        const res = await fetch(`${server.url}/api/auth/get-session`);
        expect(res.status).toBe(503);
    });
});
