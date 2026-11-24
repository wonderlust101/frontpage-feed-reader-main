// Types for what our middleware stores on res.locals, and what express-rate-limit adds to the request.

import type { RateLimitInfo } from 'express-rate-limit';
import type { AuthSession } from '../modules/auth/auth.types';

declare global {
    namespace Express {
        interface Locals {
            auth?: AuthSession;
        }

        interface Request {
            rateLimit?: RateLimitInfo;
        }
    }
}

export {};
