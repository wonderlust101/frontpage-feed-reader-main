import { afterAll, beforeAll, describe, expect, mock, spyOn, test } from 'bun:test';
import type { HealthResponse } from '@frontpage/shared';
import * as database from '../../../src/db';
import { startTestServer } from '../../helpers/test-server';

let server: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
    server = await startTestServer();
});

afterAll(async () => {
    await server.close();
});

describe('GET /api/health', () => {
    test('reports the API as ok and the database as skipped when not configured', async () => {
        const res = await fetch(`${server.url}/api/health`);

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect((await res.json()) as HealthResponse).toEqual({ api: 'ok', database: 'skipped' });
    });

    test('reports a failing database without exposing the driver\'s message, which it logs instead', async () => {
        const driverMessage = 'password authentication failed for user "frontpage_owner" at db.internal:5432';
        const check = spyOn(database, 'checkDatabase').mockResolvedValue({ status: 'error', error: driverMessage });
        const logged = mock(() => {});
        const realError = console.error;

        console.error = logged;

        try {
            const res = await fetch(`${server.url}/api/health`);
            const body = await res.text();

            expect(res.status).toBe(200);
            expect(JSON.parse(body) as HealthResponse).toEqual({ api: 'ok', database: 'error' });
            expect(body).not.toContain('frontpage_owner');
            expect(logged).toHaveBeenCalledWith('Health check: database error:', driverMessage);
        } finally {
            console.error = realError;
            check.mockRestore();
        }
    });
});
