// The categories as navigation, shared by the desktop panel and the phone drawer: one row each, the current one tinted
// with its field. With no categories it says where they will appear; when every count is 0, that you're caught up.

import type { ShellCategory } from './nav-entries';
import { FieldDot, NavRow } from './nav-row';

type CategoryListProps = {
    labelId: string;
    categories: ShellCategory[];
    currentHref: string | null;
};

// Renders the list (named by the element `labelId`), its empty note or its caught-up note.
export function CategoryList({ labelId, categories, currentHref }: CategoryListProps) {
    if (categories.length === 0) {
        return <p className="px-3 text-meta text-muted">Your categories line up here, colors and all, once you add feeds.</p>;
    }
    const isCaughtUp = categories.every((category) => category.count === 0);

    return (
        <>
            <nav aria-labelledby={labelId}>
                <ul className="flex flex-col gap-0.5">
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
            {isCaughtUp && <p className="mt-3 px-3 text-meta text-muted">All caught up. Go stretch your legs.</p>}
        </>
    );
}
