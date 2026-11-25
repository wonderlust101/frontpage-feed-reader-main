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

// Views (and "All items") are drawn in Lemon, Frontpage's own field.
export const VIEW_COLOR = 'var(--color-field-lemon)';

const MAX_SHOWN_COUNT = 99;

// The longest href that is the pathname or its parent, so /user matches /user/saved but never /username; else null.
export function findCurrentHref(pathname: string, hrefs: readonly string[]): string | null {
    let longest: string | null = null;

    for (const href of hrefs) {
        const isPathOrParent = pathname === href || pathname.startsWith(`${href}/`);

        if (isPathOrParent && (longest === null || href.length > longest.length))
            longest = href;
    }

    return longest;
}

// The view is null inside a category, so the rail and the panel never mark two places.
export function shellPlace(pathname: string, homeHref: string, viewHrefs: readonly string[], categoryHrefs: readonly string[]): ShellPlace {
    const inCategory = findCurrentHref(pathname, categoryHrefs);

    if (inCategory)
        return { view: null, category: inCategory };

    const atHome = pathname === homeHref;

    return { view: findCurrentHref(pathname, viewHrefs), category: atHome ? homeHref : null };
}

export function formatCount(count: number | null | undefined): string | null {
    if (!count)
        return null;

    return count > MAX_SHOWN_COUNT ? `${MAX_SHOWN_COUNT}+` : String(count);
}
