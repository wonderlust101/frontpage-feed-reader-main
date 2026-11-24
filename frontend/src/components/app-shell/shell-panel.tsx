'use client';

// The category panel (lg up). Collapsing animates its width while the inner column keeps its own, so nothing reflows.

import { CategoryList, type RowMenu } from './category-list';
import type { ShellCategory } from './nav-entries';

type ShellPanelProps = {
    id: string;
    homeHref: string;
    categories: ShellCategory[];
    currentHref: string | null;
    rowMenu?: RowMenu;
};

export function ShellPanel({ id, homeHref, categories, currentHref, rowMenu }: ShellPanelProps) {
    return (
        <div
            id={id}
            className="w-64 flex-none overflow-hidden bg-panel transition-[width,visibility] duration-200 ease-out sidebar-collapsed:invisible sidebar-collapsed:w-0"
        >
            <div className="flex h-full w-64 flex-col overflow-y-auto px-2.5 pt-5 pb-5">
                <CategoryList homeHref={homeHref} categories={categories} currentHref={currentHref} rowMenu={rowMenu} />
            </div>
        </div>
    );
}
