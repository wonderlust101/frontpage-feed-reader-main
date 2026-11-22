// Remembers the email address between sign-up (or sign-in) and the verify page, in sessionStorage, so the address never
// goes in a URL. Storage can be blocked (some private windows); then nothing is remembered and the verify page asks.

const STORAGE_KEY = 'frontpage-pending-email';

// Saves the address for the verify page; does nothing when storage is unavailable.
export function rememberPendingEmail(email: string): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, email);
    } catch {
        // Storage is blocked: the verify page will ask for the address instead.
    }
}

// Returns the saved address, or null when there is none or storage is unavailable.
export function readPendingEmail(): string | null {
    try {
        return sessionStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

// Clears the saved address once it is verified.
export function forgetPendingEmail(): void {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Storage is blocked, so nothing was saved.
    }
}
