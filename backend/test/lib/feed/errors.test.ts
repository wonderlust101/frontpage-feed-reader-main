import { describe, expect, test } from 'bun:test';
import type { FeedErrorCode } from '@frontpage/shared';
import { AppError } from '../../../src/lib/errors';
import { FEED_ERRORS, FeedError } from '../../../src/lib/feed';

describe('FeedError', () => {
    test.each([
        ['invalid_url', 400, false],
        ['blocked_url', 400, false],
        ['not_a_feed', 422, false],
        ['parse_error', 422, false],
        ['too_large', 413, false],
        ['http_4xx', 502, false],
        ['http_5xx', 502, true],
        ['network', 502, true],
        ['timeout', 504, true],
    ] satisfies Array<[FeedErrorCode, number, boolean]>)('%s → %i (retryable: %p)', (code, httpStatus, retryable) => {
        const err = new FeedError(code, 'message');
        expect(err).toBeInstanceOf(AppError);
        expect(err).toMatchObject({ code, httpStatus, retryable, name: 'FeedError' });
    });

    test('every code in FEED_ERRORS is covered above', () => {
        expect(Object.keys(FEED_ERRORS)).toHaveLength(9);
    });

    test('retryable can be overridden per error (e.g. 429 is a retryable 4xx)', () => {
        expect(new FeedError('http_4xx', 'rate limited', { upstreamStatus: 429, retryable: true }).retryable).toBe(true);
    });

    test('the upstream status is kept and exposed as `status` in details', () => {
        const err = new FeedError('http_5xx', 'boom', { upstreamStatus: 503 });
        expect(err.upstreamStatus).toBe(503);
        expect(err.details).toEqual({ status: 503 });
        expect(new FeedError('timeout', 'slow').details).toBeUndefined();
    });
});
