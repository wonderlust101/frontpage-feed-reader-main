// Remembers the reader's email between auth steps, so it never goes in a URL and they don't retype it. Two hand-offs:
// - Pending email (sessionStorage): from sign-up or sign-in to the verify page, in the same tab. Saved when a code
//   is sent, so the verify page knows a code is on its way; it lapses with the code (CODE_LIFETIME_MINUTES) and is
//   cleared when the reader leaves to verify later, so a later visit sends a fresh code instead of waiting for none.
// - Sign-in email (localStorage): from forgot-password to the sign-in page (a reset link usually opens in a new tab,
//   which sessionStorage doesn't reach), and from sign-up's "email already has an account" alert to sign-in or
//   forgot-password. Just the address and when it was saved, kept for an hour at most (a reset link's own lifetime)
//   and cleared as soon as the sign-in page reads it; forgot-password only peeks.
// Storage can be blocked (some private windows); then nothing is remembered and the pages simply ask again.

import { CODE_LIFETIME_MINUTES } from './schemas';

const PENDING_KEY = 'frontpage-pending-email';

const SIGN_IN_KEY = 'frontpage-sign-in-email';

const PENDING_MAX_AGE_MS = CODE_LIFETIME_MINUTES * 60 * 1000;

const SIGN_IN_MAX_AGE_MS = 60 * 60 * 1000;

// Runs a storage call, returning `fallback` when storage is unavailable or throws.
function tryStorage<T>(read: () => T, fallback: T): T {
    try {
        return read();
    } catch {
        return fallback;
    }
}

// Saves the address for the verify page, once a code has been sent to it.
export function rememberPendingEmail(email: string): void {
    tryStorage(() => sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email, savedAt: Date.now() })), undefined);
}

// Returns the saved address, or null when there is none, its code has expired, or storage is unavailable.
export function readPendingEmail(): string | null {
    return tryStorage(() => readFreshEmail(sessionStorage.getItem(PENDING_KEY), PENDING_MAX_AGE_MS), null);
}

// Clears the saved address once it is verified, or when the reader leaves to do it later.
export function forgetPendingEmail(): void {
    tryStorage(() => sessionStorage.removeItem(PENDING_KEY), undefined);
}

// Saves the address for the next sign-in.
export function rememberSignInEmail(email: string): void {
    tryStorage(() => localStorage.setItem(SIGN_IN_KEY, JSON.stringify({ email, savedAt: Date.now() })), undefined);
}

// Clears the saved address and returns it, or null when there is none, it is over an hour old, or storage is unavailable.
export function takeSignInEmail(): string | null {
    const email = readSignInEmail();
    tryStorage(() => localStorage.removeItem(SIGN_IN_KEY), undefined);
    return email;
}

// Returns the saved address without clearing it, or null when there is none, it is over an hour old, or storage is unavailable.
export function readSignInEmail(): string | null {
    return tryStorage(() => readFreshEmail(localStorage.getItem(SIGN_IN_KEY), SIGN_IN_MAX_AGE_MS), null);
}

// Parses a saved `{ email, savedAt }` value; returns the address, or null when it is missing, malformed or older than `maxAgeMs`.
// Throws on invalid JSON (tryStorage turns that into null).
function readFreshEmail(saved: string | null, maxAgeMs: number): string | null {
    if (!saved) {
        return null;
    }
    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== 'object' || parsed === null || !('email' in parsed) || !('savedAt' in parsed)) {
        return null;
    }
    const { email, savedAt } = parsed;
    const fresh = typeof savedAt === 'number' && Date.now() - savedAt < maxAgeMs;
    return fresh && typeof email === 'string' ? email : null;
}
