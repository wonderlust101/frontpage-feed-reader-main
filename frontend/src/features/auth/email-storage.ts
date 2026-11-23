// Remembers the reader's email between auth steps, so it never goes in a URL and they don't retype it. Two hand-offs:
// - Pending email (sessionStorage): from sign-up or sign-in to the verify page, in the same tab. Saved when a code
//   is sent, so the verify page knows a code is on its way.
// - Sign-in email (localStorage): from forgot-password or verify to the sign-in page. A reset link usually opens in a
//   new tab, which sessionStorage doesn't reach. Just the address and when it was saved, kept for an hour at most
//   (a reset link's own lifetime) and cleared as soon as the sign-in page reads it.
// Storage can be blocked (some private windows); then nothing is remembered and the pages simply ask again.

const PENDING_KEY = 'frontpage-pending-email';

const SIGN_IN_KEY = 'frontpage-sign-in-email';

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
    tryStorage(() => sessionStorage.setItem(PENDING_KEY, email), undefined);
}

// Returns the saved address, or null when there is none or storage is unavailable.
export function readPendingEmail(): string | null {
    return tryStorage(() => sessionStorage.getItem(PENDING_KEY), null);
}

// Clears the saved address once it is verified.
export function forgetPendingEmail(): void {
    tryStorage(() => sessionStorage.removeItem(PENDING_KEY), undefined);
}

// Saves the address for the next sign-in.
export function rememberSignInEmail(email: string): void {
    tryStorage(() => localStorage.setItem(SIGN_IN_KEY, JSON.stringify({ email, savedAt: Date.now() })), undefined);
}

// Clears the saved address and returns it, or null when there is none, it is over an hour old, or storage is unavailable.
export function takeSignInEmail(): string | null {
    return tryStorage(() => {
        const saved = localStorage.getItem(SIGN_IN_KEY);
        localStorage.removeItem(SIGN_IN_KEY);
        if (!saved) {
            return null;
        }
        const parsed: unknown = JSON.parse(saved);
        if (typeof parsed !== 'object' || parsed === null || !('email' in parsed) || !('savedAt' in parsed)) {
            return null;
        }
        const { email, savedAt } = parsed;
        const fresh = typeof savedAt === 'number' && Date.now() - savedAt < SIGN_IN_MAX_AGE_MS;
        return fresh && typeof email === 'string' ? email : null;
    }, null);
}
