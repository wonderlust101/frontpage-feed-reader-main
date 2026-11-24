'use client';

// The category panel (lg up), beside the rail: the reader's categories, the current one tinted with its field. The
// rail's "All items" is the one "all", so the panel lists only categories; with none yet it says where they will
// appear, and when every count is 0 it says so with a little cheer. It collapses to nothing (data-sidebar="collapsed"),
// its width animating and its links leaving the tab order; the inner column keeps its width, so nothing reflows.

import { useId } from 'react';
import type { ShellCategory } from './nav-entries';
import { CategoryList } from './category-list';

type ShellPanelProps = {
    id: string;
    categories: ShellCategory[];
    currentHref: string | null;
};

// Renders the panel; `id` is what the rail's toggle controls, `currentHref` the current category's href (or null).
export function ShellPanel({ id, categories, currentHref }: ShellPanelProps) {
    const labelId = useId();

    return (
        <div
            id={id}
            className="w-58 flex-none overflow-hidden bg-panel transition-[width,visibility] duration-200 ease-out sidebar-collapsed:invisible sidebar-collapsed:w-0"
        >
            <div className="flex h-full w-58 flex-col overflow-y-auto px-2.5 pt-5 pb-5">
                <p id={labelId} className="px-3 pb-2 text-meta font-semibold text-ink-2">
                    Categories
                </p>
                <CategoryList labelId={labelId} categories={categories} currentHref={currentHref} />
            </div>
        </div>
    );
}
