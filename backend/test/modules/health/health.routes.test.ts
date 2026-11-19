import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { HealthResponse } from '@frontpage/shared';
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
});
