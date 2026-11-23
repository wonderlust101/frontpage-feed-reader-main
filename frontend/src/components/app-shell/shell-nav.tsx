'use client';

// The shell's navigation: the views, then the reader's categories when there are any, then an optional foot (the
// guest card). The current page's entry is a bold paper row that runs into the sheet, with an ink-outlined marker in
// its field: Lemon for a view, the category's own color for a category. It is rendered twice (sidebar and drawer),
// so its ids come from useId.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { currentHref, formatCount, type ShellCategory, type ShellView } from './nav-entries';

type ShellNavProps = {
    views: ShellView[];
    categories?: ShellCategory[];
    foot?: ReactNode;
};

type NavRowProps = {
    href: string;
    isCurrent: boolean;
    markerColor: string;
    count?: number | null;
    children: ReactNode;
};

const VIEW_MARKER_COLOR = 'var(--color-field-lemon)';

// Renders the navigation and its foot; the current entry comes from the URL, so callers never pass it.
export function ShellNav({ views, categories = [], foot }: ShellNavProps) {
    const pathname = usePathname();
    const categoriesLabelId = useId();
    const current = currentHref(pathname, [...views.map((view) => view.href), ...categories.map((category) => category.href)]);

    return (
        <div className="flex min-h-full flex-col gap-6">
            <nav aria-label="Feeds" className="flex flex-col gap-6">
                <ul className="space-y-0.5">
                    {views.map((view) => (
                        <li key={view.href}>
                            <NavRow href={view.href} isCurrent={view.href === current} markerColor={VIEW_MARKER_COLOR} count={view.count}>
                                <Icon name={view.icon} />
                                <span className="min-w-0 truncate">{view.label}</span>
                            </NavRow>
                        </li>
                    ))}
                </ul>
                {categories.length > 0 && (
                    <div>
                        <p id={categoriesLabelId} className="mr-4 rule-t px-3 pt-3 pb-1 text-meta font-semibold text-ink-2">
                            Categories
                        </p>
                        <ul aria-labelledby={categoriesLabelId} className="space-y-0.5">
                            {categories.map((category) => (
                                <li key={category.href}>
                                    <NavRow href={category.href} isCurrent={category.href === current} markerColor={category.color} count={category.count}>
                                        <span
                                            aria-hidden="true"
                                            className="fill-edge mx-[3px] size-3.5 flex-none rounded-full"
                                            style={{ background: category.color }}
                                        />
                                        <span className="min-w-0 truncate">{category.name}</span>
                                    </NavRow>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </nav>
            {foot && <div className="mt-auto mr-4">{foot}</div>}
        </div>
    );
}

// Renders one entry with its count; the current one drops its right margin to meet the sheet and shows the marker.
function NavRow({ href, isCurrent, markerColor, count, children }: NavRowProps) {
    const shownCount = formatCount(count);

    return (
        <Link
            href={href}
            aria-current={isCurrent ? 'page' : undefined}
            className={`relative flex min-h-11 items-center gap-3 rounded-toggle px-3 text-ui ${isCurrent ? 'rounded-r-none bg-ground pl-6 font-bold text-ink' : 'mr-4 font-medium text-ink-2 hover:bg-ground/60 hover:text-ink'}`}
        >
            {isCurrent && (
                <span
                    aria-hidden="true"
                    className="absolute inset-y-2 left-1.5 w-2 rounded-full border-[1.5px] border-ink"
                    style={{ background: markerColor }}
                />
            )}
            {children}
            {shownCount && (
                <span className="ml-auto pl-2 text-meta font-semibold tabular-nums">
                    {shownCount}
                    <span className="sr-only"> unread</span>
                </span>
            )}
        </Link>
    );
}
