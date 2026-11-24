'use client';

// The workspace toolbar, the shell's <header>, sticky at the top of the page: where you are (the current category, else
// the current view, as a tag in its field) on the left, the search button centred in the workspace, and the reader's
// utilities (Aa) on the right. Search sits in the middle column of a three-column grid, so it never moves when the
// tag's width changes. Below lg it also holds the drawer's menu button. It is a size container, so the search button
// drops its label whenever the toolbar itself is narrow.

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
    utilities: ReactNode;
    search?: (query: string, categoryHref: string | null) => SearchResults;
};

const VIEW_FIELD = { color: 'var(--color-field-lemon)' };

// Renders the toolbar; `sources` and `search` feed the palette (see search-palette.tsx).
export function ShellToolbar({ homeHref, views, categories, sources, drawer, utilities, search }: ShellToolbarProps) {
    const place = shellPlace(
        usePathname(),
        homeHref,
        views.map((view) => view.href),
        categories.map((category) => category.href),
    );
    const category = categories.find((entry) => entry.href === place.category);
    const view = views.find((entry) => entry.href === place.view);

    return (
        <header className="@container sticky top-0 z-20 grid h-15 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-edge bg-workspace px-3 sm:gap-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
            </div>
            <div className="flex min-w-0 justify-center">
                <SearchPalette homeHref={homeHref} views={views} categories={categories} sources={sources} search={search} />
            </div>
            <div className="flex justify-end">{utilities}</div>
        </header>
    );
}
