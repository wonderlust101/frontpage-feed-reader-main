// Hands the reader's email between auth steps so it never goes in a URL: to the verify page in the same tab
// (sessionStorage), and to sign-in from a reset link, which usually opens in a new tab (localStorage, at most an hour).

import { CODE_LIFETIME_MINUTES } from './schemas';

const PENDING_KEY = 'frontpage-pending-email';

const SIGN_IN_KEY = 'frontpage-sign-in-email';

const PENDING_MAX_AGE_MS = CODE_LIFETIME_MINUTES * 60 * 1000;

const SIGN_IN_MAX_AGE_MS = 60 * 60 * 1000;

export function rememberPendingEmail(email: string): void {
    tryStorage(() => sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email, savedAt: Date.now() })), undefined);
}

// null when there is none, its code has expired, or storage is unavailable.
export function readPendingEmail(): string | null {
    return tryStorage(() => readFreshEmail(sessionStorage.getItem(PENDING_KEY), PENDING_MAX_AGE_MS), null);
}

export function forgetPendingEmail(): void {
    tryStorage(() => sessionStorage.removeItem(PENDING_KEY), undefined);
}

export function rememberSignInEmail(email: string): void {
    tryStorage(() => localStorage.setItem(SIGN_IN_KEY, JSON.stringify({ email, savedAt: Date.now() })), undefined);
}

// Clears the saved address as it reads it.
export function takeSignInEmail(): string | null {
    const email = readSignInEmail();

    tryStorage(() => localStorage.removeItem(SIGN_IN_KEY), undefined);

    return email;
}

// Reads without clearing (forgot-password only peeks).
export function readSignInEmail(): string | null {
    return tryStorage(() => readFreshEmail(localStorage.getItem(SIGN_IN_KEY), SIGN_IN_MAX_AGE_MS), null);
}

function tryStorage<T>(read: () => T, fallback: T): T {
    try {
        return read();
    } catch {
        return fallback;
    }
}

// Throws on invalid JSON; tryStorage turns that into null.
function readFreshEmail(saved: string | null, maxAgeMs: number): string | null {
    if (!saved)
        return null;

    const parsed: unknown = JSON.parse(saved);

    if (typeof parsed !== 'object' || parsed === null || !('email' in parsed) || !('savedAt' in parsed))
        return null;

    const { email, savedAt } = parsed;
    const fresh = typeof savedAt === 'number' && Date.now() - savedAt < maxAgeMs;

    return fresh && typeof email === 'string' ? email : null;
}
