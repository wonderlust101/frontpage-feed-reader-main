// Decides where to send someone after they sign in. Only paths on this site are followed, so a crafted
// "/sign-in?next=//evil.com" link can't send people to another site after they sign in (an "open redirect").

export const DEFAULT_AFTER_SIGN_IN = '/user';

const SAME_SITE_BASE = 'https://frontpage.invalid';

// Returns `next` as a path on this site ("/user?tab=1"), or "/user" when it is missing or points anywhere else.
// The URL parser does the hard part: it reads "//evil.com", "/\evil.com" and "/<tab>/evil.com" as another site, as browsers do.
export function safeNextPath(next: string | null | undefined): string {
    if (!next?.startsWith('/'))
        return DEFAULT_AFTER_SIGN_IN;

    const url = new URL(next, SAME_SITE_BASE);
    if (url.origin !== SAME_SITE_BASE)
        return DEFAULT_AFTER_SIGN_IN;

    return `${url.pathname}${url.search}${url.hash}`;
}
