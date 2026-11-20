// Types for what our middleware stores on res.locals.

import type { AuthSession } from '../modules/auth/auth.types';

declare global {
    namespace Express {
        interface Locals {
            auth?: AuthSession;
        }
    }
}

export {};
