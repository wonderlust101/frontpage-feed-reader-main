// The categories as navigation, shared by the desktop panel and the phone drawer: a "Categories" heading set in
// Bricolage, "All categories" first (the home page, drawn as a stack of the category fields), then one row each, the
// current one tinted with its field. With no categories it says where they will appear; when every count is 0, that
// you're caught up.

import { useId } from 'react';
import type { ShellCategory } from './nav-entries';
import { AllDots, FieldDot, NavRow } from './nav-row';

type CategoryListProps = {
    homeHref: string;
    categories: ShellCategory[];
    currentHref: string | null;
};

// Renders the heading, the list and its note; `currentHref` is the current category, or `homeHref` for all of them.
export function CategoryList({ homeHref, categories, currentHref }: CategoryListProps) {
    const labelId = useId();
    const isCaughtUp = categories.length > 0 && categories.every((category) => category.count === 0);
    const colors = categories.map((category) => category.color);

    return (
        <div>
            <p id={labelId} className="px-3 pb-3 font-display text-title leading-none font-bold tracking-[-0.02em]">
                Categories
            </p>
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
