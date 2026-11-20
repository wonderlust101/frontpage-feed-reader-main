// Guards routes that need a signed-in user. Put `requireAuth` on a router, then read the user in controllers with `currentUser(res)`.

import type { RequestHandler, Response } from 'express';
import { getSession } from '../modules/auth/auth.service';
import type { AuthUser } from '../modules/auth/auth.types';
import { UnauthorizedError } from './errors';

// Loads the session from the request's cookie into res.locals.auth; throws `unauthorized` (401) when there is none.
export const requireAuth: RequestHandler = async (req, res, next) => {
    const session = await getSession(req.headers);

    if (!session) {
        throw new UnauthorizedError('unauthorized', 'Sign in to continue');
    }

    res.locals.auth = session;
    next();
};

// The signed-in user that requireAuth stored. Throws a plain Error (a logged 500) if the route forgot requireAuth: that's a bug, not a 401.
export function currentUser(res: Response): AuthUser {
    const user = res.locals.auth?.user;

    if (!user) {
        throw new Error('currentUser() needs requireAuth on this route');
    }

    return user;
}
