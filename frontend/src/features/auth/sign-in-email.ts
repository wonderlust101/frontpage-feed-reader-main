// Carries the reader's email to the sign-in page after a password reset or a confirmed email, so they only type their
// password. A reset link usually opens in a new tab, which sessionStorage doesn't reach, so this uses localStorage:
// just the address and when it was saved, kept for an hour at most (a reset link's own lifetime) and cleared as soon
// as the sign-in page reads it. Storage can be blocked; then the field is simply empty, as before.

const STORAGE_KEY = 'frontpage-sign-in-email';

const MAX_AGE_MS = 60 * 60 * 1000;

// Saves the address for the next sign-in; does nothing when storage is unavailable.
export function rememberSignInEmail(email: string): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, savedAt: Date.now() }));
    } catch {
        // Storage is blocked: the sign-in page will start with an empty email field.
    }
}

// Returns the saved address (null when there is none, it is over an hour old, or storage is unavailable) and clears it.
export function takeSignInEmail(): string | null {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY);
        if (!saved) {
            return null;
        }
        const { email, savedAt } = JSON.parse(saved) as { email?: unknown; savedAt?: unknown };
        const fresh = typeof savedAt === 'number' && Date.now() - savedAt < MAX_AGE_MS;
        return fresh && typeof email === 'string' ? email : null;
    } catch {
        return null;
    }
}
