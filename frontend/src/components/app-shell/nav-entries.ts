// The shell's navigation entries and the two rules the sidebar follows: which entry is the current page, and how an
// unread count is shown. Hrefs identify entries, so they must be unique within one navigation.

import type { IconName } from '@/components/ui/icon';

export type ShellView = {
    href: string;
    label: string;
    icon: IconName;
    count?: number | null;
    locked?: boolean;
};

export type ShellCategory = {
    href: string;
    name: string;
    color: string;
    count?: number | null;
};

export type ShellPlace = { view: string | null; category: string | null };

const MAX_SHOWN_COUNT = 99;

// Returns the href of the current page's entry: the longest href that is the pathname or a parent of it, so /user
// matches /user/saved but never /username. Returns null when no href matches.
export function currentHref(pathname: string, hrefs: readonly string[]): string | null {
    const matches = hrefs.filter((href) => pathname === href || pathname.startsWith(`${href}/`));
    return matches.reduce<string | null>((longest, href) => (longest === null || href.length > longest.length ? href : longest), null);
}

// Returns where the reader is: the category (the panel's row: a category, or "All items", `homeHref`, on the home page)
// and the view (the rail's icon), which is null inside a category, so the rail and the panel never mark two places.
// Example: on /guest/c/design with home /guest, { view: null, category: '/guest/c/design' }.
export function shellPlace(pathname: string, homeHref: string, viewHrefs: readonly string[], categoryHrefs: readonly string[]): ShellPlace {
    const inCategory = currentHref(pathname, categoryHrefs);
    const category = inCategory ?? (pathname === homeHref ? homeHref : null);
    return { view: inCategory ? null : currentHref(pathname, viewHrefs), category };
}

// Returns the text for an unread count: null when there is none (null, undefined or 0), "99+" above 99, else the number.
export function formatCount(count: number | null | undefined): string | null {
    if (!count) {
        return null;
    }
    return count > MAX_SHOWN_COUNT ? `${MAX_SHOWN_COUNT}+` : String(count);
}
