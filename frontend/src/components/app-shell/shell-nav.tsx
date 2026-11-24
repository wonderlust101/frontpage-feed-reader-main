'use client';

// The shell's navigation in the drawer (below lg): the logo, the views with their names, the categories, and the
// account pinned to the foot, where the rail would put it. The same rows, labels and single current entry as the
// desktop rail and panel.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, type ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { Icon } from '@/components/ui/icon';
import { CategoryList } from './category-list';
import { currentEntry, type ShellCategory, type ShellView } from './nav-entries';
import { NavRow } from './nav-row';

type ShellNavProps = {
    homeHref: string;
    views: ShellView[];
    categories: ShellCategory[];
    account: ReactNode;
};

const VIEW_COLOR = 'var(--color-field-lemon)';

// Renders the drawer's contents; the current entry comes from the URL.
export function ShellNav({ homeHref, views, categories, account }: ShellNavProps) {
    const categoriesLabelId = useId();
    const current = currentEntry(
        usePathname(),
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
                        <li key={view.href}>
                            <NavRow
                                href={view.href}
                                label={view.label}
                                lead={<Icon name={view.icon} />}
                                color={VIEW_COLOR}
                                isCurrent={current?.kind === 'view' && current.href === view.href}
                                count={view.count}
                            />
                        </li>
                    ))}
                </ul>
            </nav>
            <div>
                <p id={categoriesLabelId} className="px-3 pb-2 text-meta font-semibold text-ink-2">
                    Categories
                </p>
                <CategoryList labelId={categoriesLabelId} categories={categories} currentHref={current?.kind === 'category' ? current.href : null} />
            </div>
            <div data-account="row" className="mt-auto border-t border-edge pt-3">
                {account}
            </div>
        </div>
    );
}
