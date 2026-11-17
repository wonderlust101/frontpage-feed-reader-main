import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { NextFunction, Request, Response } from 'express';
import { AppError, badRequest, notFound } from '../../src/lib/errors';
import { FeedError } from '../../src/lib/feed';
import { errorHandler } from '../../src/middleware/error-handler';

/**
 * A minimal stand-in for Express's Response that records the status and JSON body it's given,
 * so the error handler can be tested without starting a server.
 */
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

/** Runs the error handler on `err` and returns the status and body it sent. */
function handle(err: unknown) {
    const { res, sent } = fakeRes();
    errorHandler(err, {} as Request, res, (() => {}) as NextFunction);
    return sent;
}

afterEach(() => {
    mock.restore();
});

describe('errorHandler', () => {
    test('AppError: uses its status, code, retryable flag and details', () => {
        const err = new AppError('quota_exceeded', 'Too many feeds', 409, { retryable: true, details: { limit: 50 } });
        expect(handle(err)).toEqual({
            status: 409,
            body: { error: { code: 'quota_exceeded', message: 'Too many feeds', retryable: true, limit: 50 } },
        });
    });

    test('FeedError: maps its code to a status and exposes the upstream status', () => {
        const err = new FeedError('http_4xx', 'The feed server responded with 404', { upstreamStatus: 404 });
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
});
