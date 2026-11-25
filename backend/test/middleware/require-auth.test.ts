// requireAuth and currentUser without a database: requireAuth refuses with 401; currentUser without requireAuth is a bug (plain Error).

import { describe, expect, test } from 'bun:test';
import type { NextFunction, Request, Response } from 'express';
import { currentUser, requireAuth } from '../../src/middleware/require-auth';
import { UnauthorizedError } from '../../src/errors';

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

    test('throws a plain error (not a 401) when requireAuth did not run', () => {
        expect(() => currentUser({ locals: {} } as Response)).toThrow('currentUser() needs requireAuth on this route');
        expect(() => currentUser({ locals: {} } as Response)).not.toThrow(UnauthorizedError);
    });
});
