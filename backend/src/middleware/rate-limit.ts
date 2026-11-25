// Per-reader rate limits, keyed by user id (so they go after requireAuth). The count lives in this process, enough for the
// one Railway server, and resets on restart; the wait goes in X-Retry-After, the header CORS exposes.

import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { TooManyRequestsError } from '../errors';
import { currentUser } from './require-auth';

type PerUserRateLimitOptions = {
    limit: number;
    windowMs: number;
    message: string;
};

// Put it after requireAuth: the counter is keyed by the user's id.
export function perUserRateLimit({ limit, windowMs, message }: PerUserRateLimitOptions): RequestHandler {
    return rateLimit({
        limit,
        windowMs,
        standardHeaders: false,
        legacyHeaders: false,
        keyGenerator: (_req, res) => currentUser(res).id,
        handler: (req, res, next) => {
            const resetAt = req.rateLimit?.resetTime?.getTime() ?? Date.now() + windowMs;
            const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

            res.set('X-Retry-After', String(retryAfterSeconds));
            next(new TooManyRequestsError('rate_limited', message));
        },
    });
}
