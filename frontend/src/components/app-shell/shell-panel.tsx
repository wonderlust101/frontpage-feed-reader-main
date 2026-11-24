'use client';

// The category panel (lg up), beside the rail: "All categories" in Lemon, then the reader's categories, each tinted
// with its field when current. It collapses to nothing (data-sidebar="collapsed"), its width animating and its links
// leaving the tab order; the inner column keeps its width, so nothing reflows while it moves.

import { usePathname } from 'next/navigation';
import { useId } from 'react';
import { currentHref, type ShellCategory } from './nav-entries';
import { FieldDot, NavRow } from './nav-row';

type ShellPanelProps = {
    id: string;
    homeHref: string;
    categories: ShellCategory[];
};

const ALL_CATEGORIES_COLOR = 'var(--color-field-lemon)';

// Renders the panel; `id` is what the rail's toggle controls, and "All categories" links to `homeHref`.
export function ShellPanel({ id, homeHref, categories }: ShellPanelProps) {
    const labelId = useId();
    const current = currentHref(usePathname(), [homeHref, ...categories.map((category) => category.href)]);

    return (
        <div
            id={id}
            className="w-58 flex-none overflow-hidden bg-panel transition-[width,visibility] duration-200 ease-out sidebar-collapsed:invisible sidebar-collapsed:w-0"
        >
            <div className="flex h-full w-58 flex-col overflow-y-auto px-2.5 pt-4 pb-5">
                <p id={labelId} className="px-3 pb-3 font-display text-title leading-none font-bold tracking-[-0.02em]">
                    Categories
                </p>
                <nav aria-labelledby={labelId}>
                    <ul className="flex flex-col gap-0.5">
                        <li>
                            <NavRow
                                href={homeHref}
                                label="All categories"
                                lead={<FieldDot color={ALL_CATEGORIES_COLOR} />}
                                color={ALL_CATEGORIES_COLOR}
                                isCurrent={current === homeHref}
                            />
                        </li>
                        {categories.map((category) => (
                            <li key={category.href}>
                                <NavRow
                                    href={category.href}
                                    label={category.name}
                                    lead={<FieldDot color={category.color} />}
                                    color={category.color}
                                    isCurrent={category.href === current}
                                    count={category.count}
                                />
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </div>
    );
}
