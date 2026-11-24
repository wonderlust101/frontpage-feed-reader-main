// The shell's navigation entries and the two rules the sidebar follows: which entry is the current page, and how an
// unread count is shown. Hrefs identify entries, so they must be unique within one navigation.

import type { IconName } from '@/components/ui/icon';

export type ShellView = {
    href: string;
    label: string;
    icon: IconName;
    count?: number | null;
};

export type ShellCategory = {
    href: string;
    name: string;
    color: string;
    count?: number | null;
};

export type CurrentEntry = { kind: 'category' | 'view'; href: string } | null;

const MAX_SHOWN_COUNT = 99;

// Returns the href of the current page's entry: the longest href that is the pathname or a parent of it, so /user
// matches /user/saved but never /username. Returns null when no href matches.
export function currentHref(pathname: string, hrefs: readonly string[]): string | null {
    const matches = hrefs.filter((href) => pathname === href || pathname.startsWith(`${href}/`));
    return matches.reduce<string | null>((longest, href) => (longest === null || href.length > longest.length ? href : longest), null);
}

// Returns the one entry the shell marks current: a category when the path is in one (categories sit under a view's
// path), else the matching view, else null. Example: on /guest/c/design with view /guest, the Design category.
export function currentEntry(pathname: string, viewHrefs: readonly string[], categoryHrefs: readonly string[]): CurrentEntry {
    const category = currentHref(pathname, categoryHrefs);
    if (category) {
        return { kind: 'category', href: category };
    }
    const view = currentHref(pathname, viewHrefs);
    return view ? { kind: 'view', href: view } : null;
}

// Returns the text for an unread count: null when there is none (null, undefined or 0), "99+" above 99, else the number.
export function formatCount(count: number | null | undefined): string | null {
    if (!count) {
        return null;
    }
    return count > MAX_SHOWN_COUNT ? `${MAX_SHOWN_COUNT}+` : String(count);
}
