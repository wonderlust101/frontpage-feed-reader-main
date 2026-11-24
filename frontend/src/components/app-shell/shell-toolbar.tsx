'use client';

// The workspace toolbar, the shell's <header>, sticky at the top of the page. Search leads at the left, at a fixed
// width that never shrinks, so it sits in the same place on every page; where you are (the current category, else the
// current view, as a tag in its field) follows it after a hairline, so a long category name only ever moves the tag,
// never search, and a name too long for the toolbar ends in an ellipsis ("Viewing:" and the panel keep it whole).
// Below lg the drawer's menu button comes first. It is a size container, so the search button drops its label whenever
// the toolbar itself is narrow.

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CategoryTag } from '@/components/ui/tags';
import { shellPlace, type ShellCategory, type ShellView } from './nav-entries';
import { SearchPalette, type SearchResults, type SearchSource } from './search-palette';

type ShellToolbarProps = {
    homeHref: string;
    views: ShellView[];
    categories: ShellCategory[];
    sources?: SearchSource[];
    drawer: ReactNode;
    search?: (query: string, categoryHref: string | null) => SearchResults;
};

const VIEW_FIELD = { color: 'var(--color-field-lemon)' };

// Renders the toolbar; `sources` and `search` feed the palette (see search-palette.tsx).
export function ShellToolbar({ homeHref, views, categories, sources, drawer, search }: ShellToolbarProps) {
    const place = shellPlace(
        usePathname(),
        homeHref,
        views.map((view) => view.href),
        categories.map((category) => category.href),
    );
    const category = categories.find((entry) => entry.href === place.category);
    const view = views.find((entry) => entry.href === place.view);

    return (
        <header className="@container sticky top-0 z-20 flex h-15 items-center gap-2 border-b border-edge bg-workspace px-3 sm:gap-3 sm:px-5">
            {drawer}
            <SearchPalette homeHref={homeHref} views={views} categories={categories} sources={sources} search={search} />
            {(category || view) && (
                <span className="flex min-w-0 items-center gap-2 overflow-hidden sm:gap-3">
                    <span aria-hidden="true" className="h-6 w-px flex-none bg-edge" />
                    <span className="sr-only">Viewing: </span>
                    {category ? (
                        <CategoryTag name={category.name} field={{ color: category.color }} className="min-w-0 max-w-full" />
                    ) : (
                        view && <CategoryTag name={view.label} field={VIEW_FIELD} className="min-w-0 max-w-full" />
                    )}
                </span>
            )}
        </header>
    );
}
