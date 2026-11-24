// authRequest: one failure shape for every Better Auth call (code and status, the 429 wait from X-Retry-After, and
// status 0 when the request never reached the server).

import { describe, expect, test } from 'bun:test';
import { authRequest } from '../../../src/features/auth/auth-request';

function responseWithRetryAfter(value: string | null): Response {
    return new Response(null, { status: 429, headers: value === null ? {} : { 'X-Retry-After': value } });
}

describe('authRequest', () => {
    test('returns the data when the call succeeds', async () => {
        const result = await authRequest(async () => ({ data: { id: 'u1' }, error: null }));

        expect(result).toEqual({ data: { id: 'u1' }, failure: null });
    });

    test('returns the error code and status when the call fails', async () => {
        const result = await authRequest(async () => ({ data: null, error: { code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 } }));

        expect(result.failure).toEqual({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 401, retryAfterSeconds: undefined });
    });

    test('reads the wait from X-Retry-After on a 429', async () => {
        const result = await authRequest(async ({ onError }) => {
            onError({ response: responseWithRetryAfter('7') });

            return { data: null, error: { status: 429 } };
        });

        expect(result.failure).toEqual({ code: undefined, status: 429, retryAfterSeconds: 7 });
    });

    test('leaves the wait unknown when the header is missing', async () => {
        const result = await authRequest(async ({ onError }) => {
            onError({ response: responseWithRetryAfter(null) });

            return { data: null, error: { status: 429 } };
        });

        expect(result.failure?.retryAfterSeconds).toBeUndefined();
    });

    test('gives NaN for a header that is not a number, which the message falls back from', async () => {
        const result = await authRequest(async ({ onError }) => {
            onError({ response: responseWithRetryAfter('soon') });

            return { data: null, error: { status: 429 } };
        });

        expect(result.failure?.retryAfterSeconds).toBeNaN();
    });

    test('reports status 0 when the call throws, and whether the browser is offline', async () => {
        const fail = () =>
            authRequest(async () => {
                throw new TypeError('Failed to fetch');
            });
        const onLine = Object.getOwnPropertyDescriptor(globalThis.navigator, 'onLine');

        try {
            Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => true });
            expect(await fail()).toEqual({ data: null, failure: { status: 0, offline: false } });
            Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => false });
            expect(await fail()).toEqual({ data: null, failure: { status: 0, offline: true } });
        } finally {
            if (onLine) {
                Object.defineProperty(globalThis.navigator, 'onLine', onLine);
            } else {
                delete (globalThis.navigator as { onLine?: boolean }).onLine;
            }
        }
    });
});
