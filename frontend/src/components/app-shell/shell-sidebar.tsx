'use client';

// A grid, so the account sits at the rail's foot yet comes after the categories in the tab order.

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { RowMenu } from './category-list';
import { shellPlace, type ShellCategory, type ShellView } from './nav-entries';
import { ShellPanel } from './shell-panel';
import { ShellRail } from './shell-rail';

type ShellSidebarProps = {
    homeHref: string;
    views: ShellView[];
    categories: ShellCategory[];
    panelId: string;
    account: ReactNode;
    rowMenu?: RowMenu;
    className?: string;
};

export function ShellSidebar({ homeHref, views, categories, panelId, account, rowMenu, className = '' }: ShellSidebarProps) {
    const place = shellPlace(
        usePathname(),
        homeHref,
        views.map((view) => view.href),
        categories.map((category) => category.href),
    );

    return (
        <div className={`grid-cols-[4rem_auto] grid-rows-[1fr_auto] ${className}`}>
            <ShellRail homeHref={homeHref} views={views} currentView={place.view} panelId={panelId} />
            <div className="col-start-2 row-span-2 row-start-1 flex">
                <ShellPanel id={panelId} homeHref={homeHref} categories={categories} currentHref={place.category} rowMenu={rowMenu} />
            </div>
            <div className="col-start-1 row-start-2 flex justify-center bg-rail pt-2 pb-3">{account}</div>
        </div>
    );
}
