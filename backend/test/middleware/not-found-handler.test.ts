import { describe, expect, test } from 'bun:test';
import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../../src/middleware/errors';
import { notFoundHandler } from '../../src/middleware/not-found-handler';

describe('notFoundHandler', () => {
    test('passes unknown routes on to the error handler as a NotFoundError', () => {
        let forwarded: unknown;
        notFoundHandler({} as Request, {} as Response, ((err: unknown) => (forwarded = err)) as NextFunction);
        expect(forwarded).toBeInstanceOf(NotFoundError);
        expect(forwarded).toMatchObject({ status: 404, code: 'not_found', message: 'Not found', retryable: false });
    });
});
