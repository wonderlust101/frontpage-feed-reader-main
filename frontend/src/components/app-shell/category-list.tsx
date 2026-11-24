// The categories as navigation, shared by the desktop panel and the phone drawer: a "Categories" heading set in
// Bricolage, "All items" first (the home page, always Lemon: Frontpage's own field, which a reader can't recolor but may
// still give to a category), then one row each, the current one tinted with its field, each with its quick-actions
// menu when the layout gives one. With no categories it says where they will appear; when every count is 0, that
// you're caught up.

import { useId, type ReactNode } from 'react';
import type { ShellCategory } from './nav-entries';
import { FieldDot, NavRow } from './nav-row';

export type RowMenu = (category: ShellCategory) => ReactNode;

type CategoryListProps = {
    homeHref: string;
    categories: ShellCategory[];
    currentHref: string | null;
    rowMenu?: RowMenu;
};

const HOME_FIELD = 'var(--color-field-lemon)';

// Renders the heading, the list and its note; `currentHref` is the current category, or `homeHref` for "All items".
export function CategoryList({ homeHref, categories, currentHref, rowMenu }: CategoryListProps) {
    const labelId = useId();
    const isCaughtUp = categories.length > 0 && categories.every((category) => category.count === 0);

    return (
        <div>
            <h2 id={labelId} className="px-3 pb-3 font-display text-title leading-none font-bold tracking-[-0.02em]">
                Categories
            </h2>
            <nav aria-labelledby={labelId}>
                <ul className="flex flex-col gap-0.5">
                    <li>
                        <NavRow
                            href={homeHref}
                            label="All items"
                            lead={<FieldDot color={HOME_FIELD} />}
                            color={HOME_FIELD}
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
                                menu={rowMenu?.(category)}
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
