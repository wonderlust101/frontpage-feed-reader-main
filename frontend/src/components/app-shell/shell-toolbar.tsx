'use client';

// The sticky workspace toolbar. Search keeps a fixed width so it never moves; the current place follows as a tag that
// truncates. It is a size container, so the search button drops its label when the toolbar is narrow.

import type { ReactNode } from 'react';
import { CategoryTag } from '@/components/ui/tags';
import { VIEW_COLOR, type ShellCategory, type ShellView } from './nav-entries';
import { SearchPalette } from './search-palette';
import type { SearchFn, SearchSource } from './search-results';
import { useShellPlace } from './use-shell-place';

type ShellToolbarProps = {
    homeHref: string;
    views: ShellView[];
    categories: ShellCategory[];
    sources?: SearchSource[];
    drawer: ReactNode;
    search?: SearchFn;
};

export function ShellToolbar({ homeHref, views, categories, sources, drawer, search }: ShellToolbarProps) {
    const place = useShellPlace(homeHref, views, categories);
    const category = categories.find((entry) => entry.href === place.category);
    const view = views.find((entry) => entry.href === place.view);
    const currentCategoryHref = place.category !== homeHref ? place.category : null;

    let tag: { name: string; color: string } | null = null;

    if (category) {
        tag = { name: category.name, color: category.color };
    } else if (view) {
        tag = { name: view.label, color: VIEW_COLOR };
    }

    return (
        <header className="@container sticky top-0 z-20 flex h-15 items-center gap-2 border-b border-edge bg-workspace px-3 sm:gap-3 sm:px-5">
            {drawer}
            <SearchPalette views={views} categories={categories} sources={sources} search={search} currentCategoryHref={currentCategoryHref} />
            {tag && (
                <span className="flex min-w-0 items-center gap-2 overflow-hidden sm:gap-3">
                    <span aria-hidden="true" className="h-6 w-px flex-none bg-edge" />
                    <span className="sr-only">Viewing: </span>
                    <CategoryTag name={tag.name} field={{ color: tag.color }} className="min-w-0 max-w-full" />
                </span>
            )}
        </header>
    );
}
