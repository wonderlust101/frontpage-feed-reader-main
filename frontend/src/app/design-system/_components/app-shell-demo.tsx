'use client';

// The app shell at specimen scale, built from the same parts as the real shell (header, drawer, navigation, sheet) with
// sample data. The live app shows a control only once it works; this specimen shows every planned one: search, the
// update status, refresh, Add feed, the other views, categories with counts and the layout switch. Switch between a
// signed-in reader and a guest. One entry links to this page, so the real matcher marks it current.

import { useState } from 'react';
import type { ShellCategory, ShellView } from '@/components/app-shell/nav-entries';
import { ShellDrawer } from '@/components/app-shell/shell-drawer';
import { ShellHeader } from '@/components/app-shell/shell-header';
import { ShellNav } from '@/components/app-shell/shell-nav';
import { buttonClassName } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SearchField } from '@/components/ui/search-field';
import { TextLink } from '@/components/ui/text-link';
import { AccountMenu } from '@/features/auth/components/account-menu';
import { GuestCard } from '@/features/auth/components/guest-card';
import { FeedItemRow } from '@/features/items/components/feed-item-row';
import { AppearanceMenu } from '@/features/preferences/components/appearance-menu';
import { ChoiceControl } from '@/features/preferences/components/choice-control';
import { CATEGORIES, READER_CATEGORIES, SAMPLE_ITEMS, SAMPLE_READER, getCategory } from '../_data/sample-data';

type DemoMode = 'reader' | 'guest';

type Layout = 'list' | 'cards' | 'split';

const THIS_PAGE = '/design-system';

const MODE_OPTIONS = [
    { value: 'reader', label: 'Signed in' },
    { value: 'guest', label: 'Guest' },
] as const satisfies readonly { value: DemoMode; label: string }[];

const LAYOUT_OPTIONS = [
    { value: 'list', label: 'List' },
    { value: 'cards', label: 'Cards' },
    { value: 'split', label: 'Split' },
] as const satisfies readonly { value: Layout; label: string }[];

const UNREAD_COUNTS = [12, 8, 5, 3, 9, 0, 4, 2, 140];

const READER_VIEWS = [
    { href: '#all-items', label: 'All items', icon: 'all-items', count: 183 },
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

const GUEST_VIEWS = READER_VIEWS.map((view, index) => (index === 0 ? { ...view, href: THIS_PAGE, count: 37 } : view)) satisfies ShellView[];

const GUEST_NAV = CATEGORIES.map((category, index) => ({
    href: `#category-${category.id}`,
    name: category.name,
    color: category.field.color,
    count: UNREAD_COUNTS[index],
})) satisfies ShellCategory[];

// Renders the specimen: a mode switch, then the framed shell. Reader mode is on Frontend, guest mode on All items.
export function AppShellDemo() {
    const [mode, setMode] = useState<DemoMode>('reader');
    const [query, setQuery] = useState('');
    const [layout, setLayout] = useState<Layout>('list');
    const isReader = mode === 'reader';
    const nav = isReader ? (
        <ShellNav views={READER_VIEWS} categories={READER_NAV} />
    ) : (
        <ShellNav views={GUEST_VIEWS} categories={GUEST_NAV} foot={<GuestCard />} />
    );
    const items = isReader ? SAMPLE_ITEMS.filter((item) => item.category === 'frontend') : SAMPLE_ITEMS.slice(0, 4);

    return (
        <div className="flex flex-col gap-4">
            <ChoiceControl name="shell-demo-mode" legend="Show the shell" options={MODE_OPTIONS} value={mode} onChange={setMode} />
            <div className="overflow-hidden rounded-panel border border-edge bg-ground-2">
                <ShellHeader
                    homeHref={THIS_PAGE}
                    drawer={<ShellDrawer>{nav}</ShellDrawer>}
                    actions={
                        <>
                            <SearchField
                                id="shell-search"
                                label="Search feeds"
                                placeholder="Search 19 feeds"
                                value={query}
                                onChange={setQuery}
                                className="w-56 max-md:hidden xl:w-72"
                            />
                            <span className="text-meta whitespace-nowrap text-on-shell-2 max-xl:hidden">Updated 4 min ago</span>
                            <button type="button" className="shell-control max-sm:hidden">
                                <Icon name="refresh" />
                                <span className="sr-only">Refresh feeds</span>
                            </button>
                            <AppearanceMenu />
                            {isReader ? (
                                <AccountMenu user={SAMPLE_READER} />
                            ) : (
                                <TextLink href="/sign-up" standalone className="text-ui whitespace-nowrap text-on-shell max-sm:hidden">
                                    Create account
                                </TextLink>
                            )}
                            <button type="button" className={buttonClassName('secondary', 'bg-ground max-sm:px-3')}>
                                <Icon name="add-feed" />
                                <span className="max-xl:sr-only">Add feed</span>
                            </button>
                        </>
                    }
                />
                <div className="grid lg:grid-cols-[16rem_minmax(0,1fr)]">
                    <div className="hidden pt-6 pb-5 pl-4 lg:block">{nav}</div>
                    <div className="min-w-0 bg-ground px-5 pt-8 pb-10 lg:mt-3 lg:mr-3 lg:rounded-t-stage lg:border lg:border-b-0 lg:border-edge lg:px-8">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <p className="flex flex-wrap items-baseline gap-x-4">
                                <span className="type-display">{isReader ? 'Frontend' : 'All items'}</span>
                                <span className="text-ui font-semibold text-ink-2 tabular-nums">
                                    {isReader ? '12 unread · 6 feeds' : '37 unread · 19 feeds'}
                                </span>
                            </p>
                            <ChoiceControl name="shell-demo-layout" legend="Layout" options={LAYOUT_OPTIONS} value={layout} onChange={setLayout} />
                        </div>
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
