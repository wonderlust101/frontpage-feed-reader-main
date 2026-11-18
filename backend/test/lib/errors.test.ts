import { describe, expect, test } from 'bun:test';
import type { ApiErrorCode } from '@frontpage/shared';
import { AppError, ERRORS, badRequest, notFound } from '../../src/lib/errors';

describe('AppError', () => {
    test.each([
        ['bad_request', 400, false],
        ['invalid_json', 400, false],
        ['not_found', 404, false],
        ['internal_error', 500, true],
        ['invalid_url', 400, false],
        ['blocked_url', 400, false],
        ['not_a_feed', 422, false],
        ['parse_error', 422, false],
        ['too_large', 413, false],
        ['http_4xx', 502, false],
        ['http_5xx', 502, true],
        ['network', 502, true],
        ['timeout', 504, true],
    ] satisfies Array<[ApiErrorCode, number, boolean]>)('%s → %i (retryable: %p)', (code, httpStatus, retryable) => {
        expect(new AppError(code, 'message')).toMatchObject({ code, httpStatus, retryable, name: 'AppError' });
    });

    test('every code in ERRORS is covered above', () => {
        expect(Object.keys(ERRORS)).toHaveLength(13);
    });

    test('retryable can be overridden per error (e.g. 429 is a retryable 4xx)', () => {
        expect(new AppError('http_4xx', 'rate limited', { upstreamStatus: 429, retryable: true }).retryable).toBe(true);
    });

    test('keeps the upstream status of a failing feed server', () => {
        expect(new AppError('http_5xx', 'boom', { upstreamStatus: 503 }).upstreamStatus).toBe(503);
        expect(new AppError('timeout', 'slow').upstreamStatus).toBeUndefined();
    });

    test('notFound() and badRequest() build the matching errors', () => {
        expect(notFound('Feed not found')).toMatchObject({ code: 'not_found', httpStatus: 404, message: 'Feed not found' });
        expect(notFound().message).toBe('Not found');
        expect(badRequest('Title is required')).toMatchObject({ code: 'bad_request', httpStatus: 400 });
    });
});
