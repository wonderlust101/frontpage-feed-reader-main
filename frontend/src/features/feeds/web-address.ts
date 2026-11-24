// Reads what a reader typed into Add feed as a web address: "css-tricks.com", "https://web.dev/feed.xml". Only the
// shape is checked here; whether a feed lives there is for the API to find out.

const SCHEME = /^https?:\/\//i;

// Returns the address as a full https URL (keeping an http one), or null when it can't be a web address.
export function webAddress(input: string): URL | null {
    const trimmed = input.trim();
    if (trimmed === '' || /\s/.test(trimmed)) {
        return null;
    }
    try {
        const url = new URL(SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`);
        return url.hostname.includes('.') ? url : null;
    } catch {
        return null;
    }
}
