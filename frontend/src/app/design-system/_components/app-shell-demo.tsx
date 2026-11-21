'use client';

// The app shell, at specimen scale: sidebar with views and categories, a top bar with search and the primary action,
// and the feed list. Built only from the app's own components and the sample data; the unread counts are illustrative,
// one per reader category in order.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { AppSidebar } from '@/components/app-sidebar';
import { SearchField } from '@/components/ui/search-field';
import { FeedItemRow } from '@/features/items/components/feed-item-row';
import { READER_CATEGORIES, SAMPLE_ITEMS, getCategory } from '../_data/sample-data';

const VIEWS = [
    { id: 'all-items', label: 'All items', icon: 'all-items', unread: 37 },
    { id: 'saved', label: 'Saved', icon: 'saved' },
    { id: 'digest', label: 'Weekly digest', icon: 'digest' },
    { id: 'analytics', label: 'Reading', icon: 'analytics' },
] as const;

const UNREAD_COUNTS = [12, 8, 5, 3, 9, 0, 4, 2, 1];

const SIDEBAR_CATEGORIES = READER_CATEGORIES.map((category, index) => ({
    id: `category-${index}`,
    name: category.name,
    color: category.field.color,
    unread: UNREAD_COUNTS[index] ?? 0,
}));

// Renders the shell; the search field is live, links stay on this page.
export function AppShellDemo() {
    const [query, setQuery] = useState('');

    return (
        <div className="grid min-w-0 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <div className="hidden lg:block">
                <AppSidebar views={[...VIEWS]} categories={SIDEBAR_CATEGORIES} currentId="all-items" />
            </div>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <SearchField id="shell-search" label="Search items" placeholder="Search" value={query} onChange={setQuery} className="min-w-48 flex-1" />
                    <Button>
                        <Icon name="add-feed" size="action" />
                        Add feed
                    </Button>
                </div>
                <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
                    <h4 className="type-headline">
                        All items <span className="text-meta font-semibold text-ink-2 tabular-nums">37 unread</span>
                    </h4>
                    <Button variant="quiet">
                        <Icon name="mark-all-read" size="action" />
                        Mark all read
                    </Button>
                </div>
                <ul className="mt-4 rule-t">
                    {SAMPLE_ITEMS.slice(0, 4).map((item, index) => (
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
    );
}
