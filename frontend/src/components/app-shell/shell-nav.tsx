'use client';

// The shell's navigation in the drawer (below lg): the logo, the views with their names, the categories, and the
// account at the foot, where the rail would put it. The same rows and colour rules as the category panel.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, type ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { Icon } from '@/components/ui/icon';
import { currentHref, type ShellCategory, type ShellView } from './nav-entries';
import { FieldDot, NavRow } from './nav-row';

type ShellNavProps = {
    homeHref: string;
    views: ShellView[];
    categories: ShellCategory[];
    account: ReactNode;
};

const VIEW_COLOR = 'var(--color-field-lemon)';

// Renders the drawer's contents; the current view and category come from the URL.
export function ShellNav({ homeHref, views, categories, account }: ShellNavProps) {
    const pathname = usePathname();
    const categoriesLabelId = useId();
    const currentView = currentHref(
        pathname,
        views.map((view) => view.href),
    );
    const currentCategory = currentHref(
        pathname,
        categories.map((category) => category.href),
    );

    return (
        <div className="flex min-h-full flex-col gap-5">
            <Link href={homeHref} className="flex min-h-11 items-center self-start rounded-control px-3">
                <Logo size="md" />
            </Link>
            <nav aria-label="Feeds" className="flex flex-col gap-5">
                <ul className="flex flex-col gap-0.5">
                    {views.map((view) => (
                        <li key={view.href}>
                            <NavRow
                                href={view.href}
                                label={view.label}
                                lead={<Icon name={view.icon} />}
                                color={VIEW_COLOR}
                                isCurrent={view.href === currentView}
                                count={view.count}
                            />
                        </li>
                    ))}
                </ul>
                {categories.length > 0 && (
                    <div>
                        <p id={categoriesLabelId} className="px-3 pb-2 text-meta font-semibold text-muted">
                            Categories
                        </p>
                        <ul aria-labelledby={categoriesLabelId} className="flex flex-col gap-0.5">
                            {categories.map((category) => (
                                <li key={category.href}>
                                    <NavRow
                                        href={category.href}
                                        label={category.name}
                                        lead={<FieldDot color={category.color} />}
                                        color={category.color}
                                        isCurrent={category.href === currentCategory}
                                        count={category.count}
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </nav>
            <div data-account="row" className="mt-auto border-t border-edge pt-3">
                {account}
            </div>
        </div>
    );
}
