'use client';

// The desktop sidebar (lg up): the rail beside the category panel, with the account at the rail's foot. It is a grid,
// so the account sits at the bottom of the rail yet comes after the categories in the tab order: navigation first,
// personal settings last, the way the eye reads it. It works out where the reader is for both columns.

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { CategoryTools } from './category-list';
import { shellPlace, type ShellCategory, type ShellView } from './nav-entries';
import { ShellPanel } from './shell-panel';
import { ShellRail } from './shell-rail';

type ShellSidebarProps = {
    homeHref: string;
    views: ShellView[];
    categories: ShellCategory[];
    panelId: string;
    account: ReactNode;
    tools?: CategoryTools;
    className?: string;
};

// Renders the rail, the panel and the account; `panelId` is what the rail's toggle controls.
export function ShellSidebar({ homeHref, views, categories, panelId, account, tools, className = '' }: ShellSidebarProps) {
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
                <ShellPanel id={panelId} homeHref={homeHref} categories={categories} currentHref={place.category} tools={tools} />
            </div>
            <div className="col-start-1 row-start-2 flex justify-center bg-rail pt-2 pb-3">{account}</div>
        </div>
    );
}
