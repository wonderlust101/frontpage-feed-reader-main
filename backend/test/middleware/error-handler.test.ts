import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { NextFunction, Request, Response } from 'express';
import { errorHandler } from '../../src/middleware/error-handler';
import { BadGatewayError, ConflictError, GatewayTimeoutError, TooManyRequestsError } from '../../src/errors';

// A minimal fake Express Response that records the status and JSON body, so the error handler can be tested without a server.
function fakeRes() {
    const sent: { status?: number; body?: unknown } = {};
    const res = {
        status: mock((code: number) => {
            sent.status = code;

            return res;
        }),
        json: mock((body: unknown) => {
            sent.body = body;

            return res;
        }),
    };

    return { res: res as unknown as Response, sent };
}

// Runs the error handler on `err` and returns the status and body it sent.
function handle(err: unknown) {
    const { res, sent } = fakeRes();

    errorHandler(err, {} as Request, res, (() => {}) as NextFunction);

    return sent;
}

afterEach(() => {
    mock.restore();
});

describe('errorHandler', () => {
    test('sends an HttpError with its status, code and retryable flag', () => {
        expect(handle(new GatewayTimeoutError('timeout', 'The feed took longer than 10s to respond'))).toEqual({
            status: 504,
            body: { error: { code: 'timeout', message: 'The feed took longer than 10s to respond', retryable: true } },
        });
    });

    test('exposes the upstream status of a failing feed server as `status`', () => {
        const err = new BadGatewayError('http_4xx', 'The feed server responded with 404', { upstreamStatus: 404, retryable: false });

        expect(handle(err)).toEqual({
            status: 502,
            body: { error: { code: 'http_4xx', message: 'The feed server responded with 404', retryable: false, status: 404 } },
        });
    });

    test('a conflict that names the existing subscription sends its id as `subscriptionId`', () => {
        const err = new ConflictError('already_subscribed', 'You already follow this feed', { subscriptionId: 'sub-1' });

        expect(handle(err)).toEqual({
            status: 409,
            body: { error: { code: 'already_subscribed', message: 'You already follow this feed', retryable: false, subscriptionId: 'sub-1' } },
        });
    });

    test('a rate limit error is a retryable 429 without extra keys', () => {
        expect(handle(new TooManyRequestsError('rate_limited', 'Slow down'))).toEqual({
            status: 429,
            body: { error: { code: 'rate_limited', message: 'Slow down', retryable: true } },
        });
    });

    test('malformed JSON from the body parser → 400 invalid_json', () => {
        const err = Object.assign(new SyntaxError('Unexpected token n'), { status: 400, type: 'entity.parse.failed' });

        expect(handle(err)).toEqual({
            status: 400,
            body: { error: { code: 'invalid_json', message: 'The request body is not valid JSON', retryable: false } },
        });
    });

    test('other Express client errors keep their status as bad_request', () => {
        const err = Object.assign(new Error('Payload too large'), { status: 413 });

        expect(handle(err)).toEqual({
            status: 413,
            body: { error: { code: 'bad_request', message: 'Payload too large', retryable: false } },
        });
    });

    test('unexpected errors → generic 500 that hides the message, and are logged', () => {
        const log = spyOn(console, 'error').mockImplementation(() => {});
        const sent = handle(new Error('db password is hunter2'));

        expect(sent).toEqual({
            status: 500,
            body: { error: { code: 'internal_error', message: 'Internal server error', retryable: true } },
        });
        expect(JSON.stringify(sent.body)).not.toContain('hunter2');
        expect(log).toHaveBeenCalledTimes(1);
    });

    test('expected errors are not logged', () => {
        const log = spyOn(console, 'error').mockImplementation(() => {});

        handle(new BadGatewayError('network', 'Could not reach the feed'));
        expect(log).not.toHaveBeenCalled();
    });
});
