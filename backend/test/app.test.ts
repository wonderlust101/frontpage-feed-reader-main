// App-wide middleware (CORS, JSON 404, error handler). Route-specific tests live under modules/.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { startTestServer } from './helpers/test-server';

let server: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
    server = await startTestServer();
});

afterAll(async () => {
    await server.close();
});

describe('CORS', () => {
    test('allows the configured frontend origin', async () => {
        const res = await fetch(`${server.url}/api/health`, {
            headers: { Origin: 'http://localhost:3000' },
        });
        expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    });

    test('does not allow other origins', async () => {
        const res = await fetch(`${server.url}/api/health`, {
            headers: { Origin: 'https://evil.example' },
        });
        expect(res.headers.get('access-control-allow-origin')).toBeNull();
    });

    test('lets the site read X-Retry-After, so rate-limited forms can say how long to wait', async () => {
        const res = await fetch(`${server.url}/api/health`, {
            headers: { Origin: 'http://localhost:3000' },
        });
        expect(res.headers.get('access-control-expose-headers')).toBe('X-Retry-After');
    });

    test('answers the preflight for an auth POST with credentials allowed and a 2-hour cache', async () => {
        const res = await fetch(`${server.url}/api/auth/sign-in/email`, {
            method: 'OPTIONS',
            headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
        });
        expect(res.status).toBe(204);
        expect(res.headers.get('access-control-allow-credentials')).toBe('true');
        expect(res.headers.get('access-control-max-age')).toBe('7200');
    });
});

describe('error handling', () => {
    test('unknown routes return a JSON 404', async () => {
        const res = await fetch(`${server.url}/api/does-not-exist`);
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({
            error: { code: 'not_found', message: 'Not found', retryable: false },
        });
    });

    test('malformed JSON bodies return a JSON 400', async () => {
        const res = await fetch(`${server.url}/api/health`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{ not json',
        });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({
            error: { code: 'invalid_json', message: 'The request body is not valid JSON', retryable: false },
        });
    });
});
