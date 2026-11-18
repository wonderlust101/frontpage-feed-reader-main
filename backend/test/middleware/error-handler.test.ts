import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { NextFunction, Request, Response } from 'express';
import { AppError, badRequest, notFound } from '../../src/lib/errors';
import { errorHandler } from '../../src/middleware/error-handler';
import { notFound as notFoundMiddleware } from '../../src/middleware/not-found';

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
    test('AppError: takes its status and retryable flag from the ERRORS table', () => {
        expect(handle(new AppError('timeout', 'The feed took longer than 10s to respond'))).toEqual({
            status: 504,
            body: { error: { code: 'timeout', message: 'The feed took longer than 10s to respond', retryable: true } },
        });
    });

    test('AppError: exposes the upstream status of a failing feed server', () => {
        const err = new AppError('http_4xx', 'The feed server responded with 404', { upstreamStatus: 404 });
        expect(handle(err)).toEqual({
            status: 502,
            body: {
                error: {
                    code: 'http_4xx',
                    message: 'The feed server responded with 404',
                    retryable: false,
                    status: 404,
                },
            },
        });
    });

    test('helpers: notFound() and badRequest()', () => {
        expect(handle(notFound('Feed not found'))).toEqual({
            status: 404,
            body: { error: { code: 'not_found', message: 'Feed not found', retryable: false } },
        });
        expect(handle(badRequest('Title is required')).status).toBe(400);
    });

    test('malformed JSON from the body parser → 400 invalid_json', () => {
        const err = Object.assign(new SyntaxError('Unexpected token n'), { status: 400, type: 'entity.parse.failed' });
        expect(handle(err)).toEqual({
            status: 400,
            body: {
                error: { code: 'invalid_json', message: 'The request body is not valid JSON', retryable: false },
            },
        });
    });

    test('other client errors keep their status as bad_request', () => {
        const err = Object.assign(new Error('Payload too large'), { status: 413 });
        expect(handle(err)).toEqual({
            status: 413,
            body: { error: { code: 'bad_request', message: 'Payload too large', retryable: false } },
        });
    });

    test('unknown errors → generic 500 that hides the internal message, and are logged', () => {
        const log = spyOn(console, 'error').mockImplementation(() => {});
        const sent = handle(new Error('db password is hunter2'));
        expect(sent).toEqual({
            status: 500,
            body: { error: { code: 'internal_error', message: 'Internal server error', retryable: true } },
        });
        expect(JSON.stringify(sent.body)).not.toContain('hunter2');
        expect(log).toHaveBeenCalledTimes(1);
    });

    test('unknown routes are passed to the error handler as a standard not_found error', () => {
        let forwarded: unknown;
        notFoundMiddleware({} as Request, {} as Response, ((err: unknown) => (forwarded = err)) as NextFunction);
        expect(handle(forwarded)).toEqual({
            status: 404,
            body: { error: { code: 'not_found', message: 'Not found', retryable: false } },
        });
    });
});
