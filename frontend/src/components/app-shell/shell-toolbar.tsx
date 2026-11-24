'use client';

// The workspace toolbar, sticky at the top of the page: where you are (the current entry as a tag in its field), the
// search palette, and the reader's utilities (Aa) on the right. Below lg it also holds the drawer's menu button. It is
// a size container, so the search button drops its label whenever the toolbar itself is narrow.

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CategoryTag } from '@/components/ui/tags';
import { currentHref, type ShellCategory, type ShellView } from './nav-entries';
import { SearchPalette, type SearchResults } from './search-palette';

type ShellToolbarProps = {
    views: ShellView[];
    categories: ShellCategory[];
    drawer: ReactNode;
    utilities: ReactNode;
    search?: (query: string, categoryHref: string | null) => SearchResults;
};

const VIEW_FIELD = { color: 'var(--color-field-lemon)' };

// Renders the toolbar; the location tag shows the current category, else the current view, in its field. `search`
// answers the palette's queries; without it the palette says there is nothing to search yet.
export function ShellToolbar({ views, categories, drawer, utilities, search }: ShellToolbarProps) {
    const pathname = usePathname();
    const category = categories.find(
        (entry) =>
            entry.href ===
            currentHref(
                pathname,
                categories.map((each) => each.href),
            ),
    );
    const view = views.find(
        (entry) =>
            entry.href ===
            currentHref(
                pathname,
                views.map((each) => each.href),
            ),
    );

    return (
        <div className="@container sticky top-0 z-20 flex h-15 items-center gap-2 border-b border-edge bg-workspace px-3 sm:gap-3 sm:px-5">
            {drawer}
            {category ? <CategoryTag name={category.name} field={{ color: category.color }} /> : view && <CategoryTag name={view.label} field={VIEW_FIELD} />}
            <div className="ml-auto flex min-w-0 md:mr-auto md:ml-3">
                <SearchPalette categories={categories} search={search} />
            </div>
            {utilities}
        </div>
    );
}
