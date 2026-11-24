// Hrefs identify entries, so they must be unique within one navigation. A view with a `preview` is account-only:
// never current, and its href is where its Create account button leads.

import type { IconName } from '@/components/ui/icon';

export type ShellView = {
    href: string;
    label: string;
    icon: IconName;
    count?: number | null;
    preview?: string;
};

export type ShellCategory = {
    href: string;
    name: string;
    color: string;
    count?: number | null;
};

export type ShellPlace = { view: string | null; category: string | null };

const MAX_SHOWN_COUNT = 99;

// The longest href that is the pathname or its parent, so /user matches /user/saved but never /username; else null.
export function currentHref(pathname: string, hrefs: readonly string[]): string | null {
    const matches = hrefs.filter((href) => pathname === href || pathname.startsWith(`${href}/`));

    return matches.reduce<string | null>((longest, href) => (longest === null || href.length > longest.length ? href : longest), null);
}

// The view is null inside a category, so the rail and the panel never mark two places.
export function shellPlace(pathname: string, homeHref: string, viewHrefs: readonly string[], categoryHrefs: readonly string[]): ShellPlace {
    const inCategory = currentHref(pathname, categoryHrefs);
    const category = inCategory ?? (pathname === homeHref ? homeHref : null);

    return { view: inCategory ? null : currentHref(pathname, viewHrefs), category };
}

// null when there is nothing to show (null, undefined or 0), "99+" above 99.
export function formatCount(count: number | null | undefined): string | null {
    if (!count)
        return null;

    return count > MAX_SHOWN_COUNT ? `${MAX_SHOWN_COUNT}+` : String(count);
}
