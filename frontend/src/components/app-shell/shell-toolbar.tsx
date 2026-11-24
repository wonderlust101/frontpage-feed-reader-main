'use client';

// The workspace toolbar, the shell's <header>, sticky at the top of the page: where you are (the current category, else
// the current view, as a tag in its field), the search palette, and the reader's utilities (Aa) on the right. Below lg
// it also holds the drawer's menu button. It is a size container, so the search button drops its label whenever the
// toolbar itself is narrow.

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CategoryTag } from '@/components/ui/tags';
import { currentEntry, type ShellCategory, type ShellView } from './nav-entries';
import { SearchPalette, type SearchResults, type SearchSource } from './search-palette';

type ShellToolbarProps = {
    views: ShellView[];
    categories: ShellCategory[];
    sources?: SearchSource[];
    drawer: ReactNode;
    utilities: ReactNode;
    search?: (query: string, categoryHref: string | null) => SearchResults;
};

const VIEW_FIELD = { color: 'var(--color-field-lemon)' };

// Renders the toolbar; `sources` and `search` feed the palette (see search-palette.tsx).
export function ShellToolbar({ views, categories, sources, drawer, utilities, search }: ShellToolbarProps) {
    const current = currentEntry(
        usePathname(),
        views.map((view) => view.href),
        categories.map((category) => category.href),
    );
    const category = current?.kind === 'category' ? categories.find((entry) => entry.href === current.href) : undefined;
    const view = current?.kind === 'view' ? views.find((entry) => entry.href === current.href) : undefined;

    return (
        <header className="@container sticky top-0 z-20 flex h-15 items-center gap-2 border-b border-edge bg-workspace px-3 sm:gap-3 sm:px-5">
            {drawer}
            {(category || view) && (
                <span className="flex min-w-0">
                    <span className="sr-only">Viewing: </span>
                    {category ? (
                        <CategoryTag name={category.name} field={{ color: category.color }} />
                    ) : (
                        view && <CategoryTag name={view.label} field={VIEW_FIELD} />
                    )}
                </span>
            )}
            <div className="ml-auto flex min-w-0 md:mr-auto md:ml-3">
                <SearchPalette views={views} categories={categories} sources={sources} search={search} />
            </div>
            {utilities}
        </header>
    );
}
