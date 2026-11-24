'use client';

// The sticky workspace toolbar. Search keeps a fixed width so it never moves; the current place follows as a tag that
// truncates. It is a size container, so the search button drops its label when the toolbar is narrow.

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
