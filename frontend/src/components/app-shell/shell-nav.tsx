'use client';

// The shell's navigation in the drawer (below lg): the logo, the views with their names, the categories ("All
// categories" first), and the account pinned to the foot, where the rail would put it. The same rows, labels and
// markers as the desktop rail and panel: the current view, and the current category or "all".

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { Icon } from '@/components/ui/icon';
import { CategoryList } from './category-list';
import { shellPlace, type ShellCategory, type ShellView } from './nav-entries';
import { NavRow } from './nav-row';

type ShellNavProps = {
    homeHref: string;
    views: ShellView[];
    categories: ShellCategory[];
    account: ReactNode;
};

const VIEW_COLOR = 'var(--color-field-lemon)';

// Renders the drawer's contents; where the reader is comes from the URL.
export function ShellNav({ homeHref, views, categories, account }: ShellNavProps) {
    const place = shellPlace(
        usePathname(),
        homeHref,
        views.map((view) => view.href),
        categories.map((category) => category.href),
    );

    return (
        <div className="flex flex-1 flex-col gap-5">
            <Link href={homeHref} className="flex min-h-11 items-center self-start rounded-control px-3">
                <Logo size="md" />
            </Link>
            <nav aria-label="Views">
                <ul className="flex flex-col gap-0.5">
                    {views.map((view) => (
                        <li key={view.label}>
                            <NavRow
                                href={view.href}
                                label={view.label}
                                lead={<Icon name={view.icon} />}
                                color={VIEW_COLOR}
                                isCurrent={view.href === place.view && place.category === null}
                                count={view.count}
                                locked={view.locked}
                            />
                        </li>
                    ))}
                </ul>
            </nav>
            <CategoryList homeHref={homeHref} categories={categories} currentHref={place.category} />
            <div data-account="row" className="mt-auto border-t border-edge pt-3">
                {account}
            </div>
        </div>
    );
}
