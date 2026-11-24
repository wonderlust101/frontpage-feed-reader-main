import { describe, expect, test } from 'bun:test';
import {
    BadGatewayError,
    BadRequestError,
    GatewayTimeoutError,
    HttpError,
    NotFoundError,
    PayloadTooLargeError,
    UnprocessableEntityError,
    isRetryableStatus,
} from '../../../src/middleware/errors';

const STATUS_CLASSES = [
    { ErrorClass: BadRequestError, status: 400, retryable: false },
    { ErrorClass: NotFoundError, status: 404, retryable: false },
    { ErrorClass: PayloadTooLargeError, status: 413, retryable: false },
    { ErrorClass: UnprocessableEntityError, status: 422, retryable: false },
    { ErrorClass: BadGatewayError, status: 502, retryable: true },
    { ErrorClass: GatewayTimeoutError, status: 504, retryable: true },
];

describe('status classes', () => {
    for (const { ErrorClass, status, retryable } of STATUS_CLASSES) {
        test(`${ErrorClass.name} → ${status} (retryable by default: ${retryable})`, () => {
            const err = new ErrorClass('bad_request', 'message');

            expect(err).toBeInstanceOf(HttpError);
            expect(err).toMatchObject({ status, retryable, code: 'bad_request', message: 'message', name: ErrorClass.name });
        });
    }
});

describe('HttpError', () => {
    test('retryable can be overridden per error', () => {
        expect(new BadGatewayError('http_4xx', 'dead feed', { retryable: false }).retryable).toBe(false);
    });

    test('keeps the upstream status of a failing feed server', () => {
        expect(new BadGatewayError('http_5xx', 'boom', { upstreamStatus: 503 }).upstreamStatus).toBe(503);
        expect(new GatewayTimeoutError('timeout', 'slow').upstreamStatus).toBeUndefined();
    });
});

describe('isRetryableStatus', () => {
    test.each([
        [500, true],
        [503, true],
        [408, true],
        [429, true],
        [400, false],
        [404, false],
    ])('%i → %p', (status, retryable) => {
        expect(isRetryableStatus(status)).toBe(retryable);
    });
});
