'use client';

// The category panel (lg up), beside the rail: the categories, "All categories" first. It collapses to nothing
// (data-sidebar="collapsed"), its width animating and its links leaving the tab order; the inner column keeps its
// width, so nothing reflows while it moves.

import type { ShellCategory } from './nav-entries';
import { CategoryList } from './category-list';

type ShellPanelProps = {
    id: string;
    homeHref: string;
    categories: ShellCategory[];
    currentHref: string | null;
};

// Renders the panel; `id` is what the rail's toggle controls, `currentHref` the current category (or `homeHref`).
export function ShellPanel({ id, homeHref, categories, currentHref }: ShellPanelProps) {
    return (
        <div
            id={id}
            className="w-58 flex-none overflow-hidden bg-panel transition-[width,visibility] duration-200 ease-out sidebar-collapsed:invisible sidebar-collapsed:w-0"
        >
            <div className="flex h-full w-58 flex-col overflow-y-auto px-2.5 pt-5 pb-5">
                <CategoryList homeHref={homeHref} categories={categories} currentHref={currentHref} />
            </div>
        </div>
    );
}
