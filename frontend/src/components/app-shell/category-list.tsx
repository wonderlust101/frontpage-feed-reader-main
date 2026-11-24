// The categories as navigation, shared by the desktop panel and the phone drawer: the Add feed control, a "Categories"
// heading set in Bricolage with the Manage link beside it, "All categories" first (the home page, drawn as a stack of
// the category fields), then one row each, the current one tinted with its field, each with its quick-actions menu when
// given. With no categories it says where they will appear; when every count is 0, that you're caught up.

import { useId, type ReactNode } from 'react';
import type { ShellCategory } from './nav-entries';
import { AllDots, FieldDot, NavRow } from './nav-row';

export type CategoryTools = {
    add?: ReactNode;
    manage?: ReactNode;
    rowMenu?: (category: ShellCategory) => ReactNode;
};

type CategoryListProps = {
    homeHref: string;
    categories: ShellCategory[];
    currentHref: string | null;
    tools?: CategoryTools;
};

// Renders the tools, heading, list and note; `currentHref` is the current category, or `homeHref` for all of them.
// `tools` comes from the route's layout: `add` sits above the heading, `manage` beside it, `rowMenu` on each row.
export function CategoryList({ homeHref, categories, currentHref, tools = {} }: CategoryListProps) {
    const labelId = useId();
    const isCaughtUp = categories.length > 0 && categories.every((category) => category.count === 0);
    const colors = categories.map((category) => category.color);

    return (
        <div>
            {tools.add && <div className="mb-6">{tools.add}</div>}
            <div className="flex items-baseline justify-between gap-2 pr-1 pb-3 pl-3">
                <p id={labelId} className="font-display text-title leading-none font-bold tracking-[-0.02em]">
                    Categories
                </p>
                {tools.manage}
            </div>
            <nav aria-labelledby={labelId}>
                <ul className="flex flex-col gap-0.5">
                    <li>
                        <NavRow
                            href={homeHref}
                            label="All categories"
                            lead={<AllDots colors={colors} />}
                            color="var(--color-field-lemon)"
                            isCurrent={currentHref === homeHref}
                        />
                    </li>
                    {categories.map((category) => (
                        <li key={category.href}>
                            <NavRow
                                href={category.href}
                                label={category.name}
                                lead={<FieldDot color={category.color} />}
                                color={category.color}
                                isCurrent={category.href === currentHref}
                                count={category.count}
                                menu={tools.rowMenu?.(category)}
                            />
                        </li>
                    ))}
                </ul>
            </nav>
            {categories.length === 0 && <p className="mt-3 px-3 text-meta text-muted">Your categories line up here, colors and all, once you add feeds.</p>}
            {isCaughtUp && <p className="mt-3 px-3 text-meta text-muted">All caught up. Go stretch your legs.</p>}
        </div>
    );
}
