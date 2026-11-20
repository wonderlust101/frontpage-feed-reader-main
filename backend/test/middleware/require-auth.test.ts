// requireAuth and currentUser without a database: nobody is signed in, so both refuse with 401.

import { describe, expect, test } from 'bun:test';
import type { NextFunction, Request, Response } from 'express';
import { currentUser, requireAuth } from '../../src/middleware/require-auth';
import { UnauthorizedError } from '../../src/middleware/errors';

describe('requireAuth', () => {
    test('throws unauthorized and never calls next when there is no session', async () => {
        let nextCalled = false;
        const req = { headers: {} } as Request;
        const res = { locals: {} } as Response;
        const next = (() => {
            nextCalled = true;
        }) as NextFunction;

        await expect(Promise.resolve(requireAuth(req, res, next))).rejects.toBeInstanceOf(UnauthorizedError);
        expect(nextCalled).toBe(false);
    });
});

describe('currentUser', () => {
    test('returns the user requireAuth stored', () => {
        const user = { id: 'u1', email: 'a@example.com' };
        const res = { locals: { auth: { user } } } as unknown as Response;
        expect(currentUser(res)).toBe(user as never);
    });

    test('throws unauthorized when requireAuth did not run', () => {
        expect(() => currentUser({ locals: {} } as Response)).toThrow(UnauthorizedError);
    });
});
