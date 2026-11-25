'use client';

// A client component because the row menu is a function; the page and guest menu still render on the server.

import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell/app-shell';
import type { ShellCategory, ShellView } from '@/components/app-shell/nav-entries';
import type { SearchSource } from '@/components/app-shell/search-results';
import { CategoryRowMenu } from '@/features/categories/components/category-row-menu';
import { GUEST_CATEGORIES, guestCategoryColor, guestCategoryHref } from '@/features/categories/guest-categories';
import { useGuestCategoryFields } from '@/features/categories/hooks/use-guest-category-fields';

type GuestShellProps = {
    views: ShellView[];
    sources: SearchSource[];
    account: ReactNode;
    children: ReactNode;
};

// The colors are CSS properties the guest's choices override, so this list never changes.
const SHELL_CATEGORIES = GUEST_CATEGORIES.map((category) => ({
    href: guestCategoryHref(category.id),
    name: category.name,
    color: guestCategoryColor(category),
})) satisfies ShellCategory[];

export function GuestShell({ views, sources, account, children }: GuestShellProps) {
    const [fields, choose] = useGuestCategoryFields();

    function rowMenu(shellCategory: ShellCategory) {
        const category = GUEST_CATEGORIES.find((entry) => guestCategoryHref(entry.id) === shellCategory.href);

        if (!category)
            return null;

        return <CategoryRowMenu category={{ name: category.name, fieldId: fields[category.id].id }} onRecolor={(fieldId) => choose(category.id, fieldId)} />;
    }

    return (
        <AppShell homeHref="/guest" views={views} categories={SHELL_CATEGORIES} sources={sources} account={account} rowMenu={rowMenu}>
            {children}
        </AppShell>
    );
}
