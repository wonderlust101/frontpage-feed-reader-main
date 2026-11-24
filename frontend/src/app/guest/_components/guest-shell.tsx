'use client';

// The app shell as guests see it: the curated categories in the colors this guest chose (their presets until then),
// each row with a color menu that saves the choice on this device. A client component, because the colors live in
// localStorage and the row menu is a function; the page and the guest menu still render on the server, passed in.

import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell/app-shell';
import type { ShellCategory, ShellView } from '@/components/app-shell/nav-entries';
import type { SearchSource } from '@/components/app-shell/search-palette';
import { CategoryRowMenu } from '@/features/categories/components/category-row-menu';
import { GUEST_CATEGORIES } from '@/features/categories/guest-categories';
import { useGuestCategoryFields } from '@/features/categories/use-guest-category-fields';

type GuestShellProps = {
    views: ShellView[];
    sources: SearchSource[];
    account: ReactNode;
    children: ReactNode;
};

// Renders the shell for /guest with the guest's category colors and color menus.
export function GuestShell({ views, sources, account, children }: GuestShellProps) {
    const [fields, choose] = useGuestCategoryFields();
    const categories = GUEST_CATEGORIES.map((category) => ({
        href: `/guest/c/${category.id}`,
        name: category.name,
        color: fields[category.id].color,
    })) satisfies ShellCategory[];

    // Renders a category's color menu.
    function colorMenu(shellCategory: ShellCategory) {
        const category = GUEST_CATEGORIES.find((entry) => `/guest/c/${entry.id}` === shellCategory.href);
        return (
            category && (
                <CategoryRowMenu category={{ name: category.name, fieldId: fields[category.id].id }} onRecolor={(fieldId) => choose(category.id, fieldId)} />
            )
        );
    }

    return (
        <AppShell homeHref="/guest" views={views} categories={categories} sources={sources} account={account} rowMenu={colorMenu}>
            {children}
        </AppShell>
    );
}
