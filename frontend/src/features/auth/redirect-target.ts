// Only paths on this site are followed, so a crafted "/sign-in?next=//evil.com" link can't redirect off-site.

export const ACCOUNT_HOME = '/user';

export const DEFAULT_AFTER_SIGN_IN = ACCOUNT_HOME;

const SAME_SITE_BASE = 'https://frontpage.invalid';

// The URL parser reads "//evil.com", "/\evil.com" and "/<tab>/evil.com" as another site, as browsers do.
export function safeNextPath(next: string | null | undefined): string {
    if (!next?.startsWith('/'))
        return DEFAULT_AFTER_SIGN_IN;

    const url = new URL(next, SAME_SITE_BASE);

    if (url.origin !== SAME_SITE_BASE)
        return DEFAULT_AFTER_SIGN_IN;

    return `${url.pathname}${url.search}${url.hash}`;
}
