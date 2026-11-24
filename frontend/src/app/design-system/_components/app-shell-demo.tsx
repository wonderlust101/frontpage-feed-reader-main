'use client';

// The app shell at specimen scale, built from the same parts as the real shell (rail, category panel, toolbar, drawer)
// with sample data: categories with counts, a signed-in reader or a guest, and a search palette that searches the
// sample items and sources. The live app shows categories and results once their data exists. One view and one
// category link to this page, so the real matcher marks them current.

import { useState } from 'react';
import type { ShellCategory, ShellView } from '@/components/app-shell/nav-entries';
import type { SearchResults } from '@/components/app-shell/search-palette';
import { ShellDrawer } from '@/components/app-shell/shell-drawer';
import { ShellNav } from '@/components/app-shell/shell-nav';
import { ShellSidebar } from '@/components/app-shell/shell-sidebar';
import { ShellToolbar } from '@/components/app-shell/shell-toolbar';
import { AccountMenu } from '@/features/auth/components/account-menu';
import { GuestMenu } from '@/features/auth/components/guest-menu';
import { FeedItemRow } from '@/features/items/components/feed-item-row';
import { ChoiceControl } from '@/features/preferences/components/choice-control';
import { ReaderSettings } from '@/features/preferences/components/reader-settings';
import { CATEGORIES, READER_CATEGORIES, SAMPLE_ITEMS, SAMPLE_READER, getCategory, type CategoryId } from '../_data/sample-data';

type DemoMode = 'reader' | 'guest';

const THIS_PAGE = '/design-system';

const PANEL_ID = 'demo-categories';

const MODE_OPTIONS = [
    { value: 'reader', label: 'Signed in' },
    { value: 'guest', label: 'Guest' },
] as const satisfies readonly { value: DemoMode; label: string }[];

const UNREAD_COUNTS = [12, 8, 5, 3, 9, 0, 4, 2, 140];

const VIEWS = [
    { href: THIS_PAGE, label: 'All items', icon: 'all-items', count: 183 },
    { href: '#saved', label: 'Saved', icon: 'saved', count: 4 },
    { href: '#digest', label: 'Weekly digest', icon: 'digest' },
    { href: '#reading', label: 'Reading', icon: 'analytics' },
] satisfies ShellView[];

const READER_NAV = READER_CATEGORIES.map((category, index) => ({
    href: index === 0 ? THIS_PAGE : `#category-${index}`,
    name: category.name,
    color: category.field.color,
    count: UNREAD_COUNTS[index],
})) satisfies ShellCategory[];

const GUEST_NAV = CATEGORIES.map((category, index) => ({
    href: `#category-${category.id}`,
    name: category.name,
    color: category.field.color,
    count: UNREAD_COUNTS[index],
})) satisfies ShellCategory[];

const CATEGORY_BY_HREF = new Map<string, CategoryId>([
    [THIS_PAGE, 'frontend'],
    ...CATEGORIES.map((category): [string, CategoryId] => [`#category-${category.id}`, category.id]),
    ...CATEGORIES.map((category, index): [string, CategoryId] => [`#category-${index}`, category.id]),
]);

// Renders the specimen: a mode switch, then the framed shell. Reader mode is on Frontend, guest mode on All items.
export function AppShellDemo() {
    const [mode, setMode] = useState<DemoMode>('reader');
    const isReader = mode === 'reader';
    const homeHref = isReader ? '#patterns' : THIS_PAGE;
    const categories = isReader ? READER_NAV : GUEST_NAV;
    const account = isReader ? <AccountMenu user={SAMPLE_READER} /> : <GuestMenu />;
    const title = isReader ? 'Frontend' : 'All items';
    const titleField = isReader ? getCategory('frontend').field.color : 'var(--color-field-lemon)';
    const items = isReader ? SAMPLE_ITEMS.filter((item) => item.category === 'frontend') : SAMPLE_ITEMS.slice(0, 4);

    return (
        <div className="flex flex-col gap-4">
            <div className="max-w-xs">
                <ChoiceControl name="shell-demo-mode" legend="Show the shell" options={MODE_OPTIONS} value={mode} onChange={setMode} />
            </div>
            <div className="flex h-[40rem] overflow-hidden rounded-panel border border-edge bg-workspace">
                <ShellSidebar
                    homeHref={homeHref}
                    views={VIEWS}
                    categories={categories}
                    panelId={PANEL_ID}
                    account={account}
                    className="hidden flex-none lg:grid"
                />
                <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                    <ShellToolbar
                        homeHref={homeHref}
                        views={VIEWS}
                        categories={categories}
                        drawer={
                            <ShellDrawer>
                                <ShellNav homeHref={homeHref} views={VIEWS} categories={categories} account={account} />
                            </ShellDrawer>
                        }
                        utilities={<ReaderSettings />}
                        search={searchSamples}
                    />
                    <div className="px-5 pt-8 pb-10 sm:px-8">
                        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                            <span
                                className="type-display underline decoration-[0.12em] underline-offset-[0.14em] [text-decoration-skip-ink:none]"
                                style={{ textDecorationColor: titleField }}
                            >
                                {title}
                            </span>
                            <span className="text-ui font-semibold text-ink-2 tabular-nums">{isReader ? '12 unread · 6 feeds' : '37 unread · 19 feeds'}</span>
                        </p>
                        <ul className="mt-6 rule-t">
                            {items.map((item, index) => (
                                <FeedItemRow
                                    key={item.id}
                                    title={item.title}
                                    href="#patterns"
                                    source={item.source}
                                    time={item.time}
                                    isNew={item.isNew}
                                    health={item.health}
                                    category={getCategory(item.category)}
                                    isSelected={index === 0}
                                />
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Searches the sample items (by title) and sources (by name) for the palette, within one sample category when given.
function searchSamples(query: string, categoryHref: string | null): SearchResults {
    const needle = query.toLowerCase();
    const categoryId = categoryHref ? CATEGORY_BY_HREF.get(categoryHref) : undefined;
    const inScope = (id: CategoryId) => !categoryHref || id === categoryId;
    return {
        articles: SAMPLE_ITEMS.filter((item) => inScope(item.category) && item.title.toLowerCase().includes(needle)).map((item) => ({
            href: '#patterns',
            title: item.title,
            source: item.source,
            time: item.time,
        })),
        sources: CATEGORIES.filter((category) => inScope(category.id)).flatMap((category) =>
            category.sources
                .filter((source) => source.toLowerCase().includes(needle))
                .map((source) => ({ href: '#patterns', name: source, detail: category.name, categoryHref: `#category-${category.id}` })),
        ),
    };
}
