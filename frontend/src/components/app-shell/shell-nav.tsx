'use client';

// The drawer's navigation (below lg): the same rows and markers as the desktop rail and panel, account at the foot.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { Icon } from '@/components/ui/icon';
import { CategoryList, type RowMenu } from './category-list';
import { LockedView } from './locked-view';
import { VIEW_COLOR, type ShellCategory, type ShellView } from './nav-entries';
import { NavRow } from './nav-row';
import { useShellPlace } from './use-shell-place';

type ShellNavProps = {
    homeHref: string;
    views: ShellView[];
    categories: ShellCategory[];
    account: ReactNode;
    rowMenu?: RowMenu;
};

export function ShellNav({ homeHref, views, categories, account, rowMenu }: ShellNavProps) {
    const place = useShellPlace(homeHref, views, categories);

    return (
        <div className="flex flex-1 flex-col gap-5">
            <Link href={homeHref} className="flex min-h-11 items-center self-start rounded-control px-3">
                <Logo size="md" />
            </Link>
            <nav aria-label="Views">
                <ul className="flex flex-col gap-0.5">
                    {views
                        .filter((view) => view.href !== homeHref)
                        .map((view) => (
                            <li key={view.label}>
                                {view.preview ? (
                                    <LockedView view={view} preview={view.preview} variant="row" />
                                ) : (
                                    <NavRow
                                        href={view.href}
                                        label={view.label}
                                        lead={<Icon name={view.icon} />}
                                        color={VIEW_COLOR}
                                        isCurrent={view.href === place.view}
                                        count={view.count}
                                    />
                                )}
                            </li>
                        ))}
                </ul>
            </nav>
            <CategoryList homeHref={homeHref} categories={categories} currentHref={place.category} rowMenu={rowMenu} />
            <div data-account="row" className="mt-auto border-t border-edge pt-3">
                {account}
            </div>
        </div>
    );
}
