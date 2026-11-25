// HTTP in/out for /api/auth/*: hands every request to Better Auth (sign-up, sign-in, sign-out, get-session, password reset).

import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { ServiceUnavailableError } from '../../errors';
import { auth } from './auth.service';

const betterAuthHandler = auth ? toNodeHandler(auth) : null;

// ALL /api/auth/*: answered by Better Auth; throws `database_unavailable` (503) when the API runs without a database.
export async function authController(req: Request, res: Response) {
    if (!betterAuthHandler)
        throw new ServiceUnavailableError('database_unavailable', 'Accounts are unavailable: the API has no database');

    await betterAuthHandler(req, res);
}
