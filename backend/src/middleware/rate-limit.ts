// Per-reader rate limits for routes behind requireAuth, built on express-rate-limit's in-memory store.
// Requests are counted per signed-in user, not per IP. The count lives in this process, which is enough for the one
// long-running Railway server; it resets on restart. The wait goes in X-Retry-After (seconds), the header CORS exposes.

import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { TooManyRequestsError } from './errors';
import { currentUser } from './require-auth';

type PerUserRateLimitOptions = {
    limit: number;
    windowMs: number;
    message: string;
};

// Lets each signed-in user make `limit` requests per `windowMs`; the next one gets X-Retry-After and a 429 `rate_limited` with `message`.
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
