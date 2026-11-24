'use client';

// The app shell at specimen scale, built from the same parts as the real shell (rail, category panel, toolbar, drawer)
// with sample data: categories with counts, a signed-in reader or a guest, and a search palette that searches the
// sample items and sources. The reader's category tools work here on a sample library: Add feed, each row's quick
// actions and the Manage page, with Undo in a toast. The live app gets them when the categories and subscriptions
// endpoints exist; guests see them locked. One view and one category link to this page, so the matcher marks them.

import { useState, type MouseEvent } from 'react';
import type { CategoryTools } from '@/components/app-shell/category-list';
import type { ShellCategory, ShellView } from '@/components/app-shell/nav-entries';
import type { SearchResults } from '@/components/app-shell/search-palette';
import { ShellDrawer } from '@/components/app-shell/shell-drawer';
import { ShellNav } from '@/components/app-shell/shell-nav';
import { ShellSidebar } from '@/components/app-shell/shell-sidebar';
import { ShellToolbar } from '@/components/app-shell/shell-toolbar';
import { Icon } from '@/components/ui/icon';
import { Toast } from '@/components/ui/toast';
import { AccountMenu } from '@/features/auth/components/account-menu';
import { GuestMenu } from '@/features/auth/components/guest-menu';
import { CategoryRowMenu } from '@/features/categories/components/category-row-menu';
import { ManageCategories } from '@/features/categories/components/manage-categories';
import { ManageLink } from '@/features/categories/components/manage-link';
import { NO_FIELD, categoryFieldById } from '@/features/categories/fields';
import { deleteCategory, isNameTaken, placeFeed, updateCategory, type Library } from '@/features/categories/library';
import { AddFeed, AddFeedLocked } from '@/features/feeds/components/add-feed';
import { FeedItemRow } from '@/features/items/components/feed-item-row';
import { ChoiceControl } from '@/features/preferences/components/choice-control';
import { ReaderSettings } from '@/features/preferences/components/reader-settings';
import { CATEGORIES, READER_CATEGORIES, SAMPLE_ITEMS, SAMPLE_READER, getCategory, type CategoryId } from '../_data/sample-data';

type DemoMode = 'reader' | 'guest';

type DemoToast = { message: string; undo: Library | null };

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

const FIRST_CATEGORY = 'category-0';

const START_LIBRARY: Library = {
    categories: READER_CATEGORIES.map((category, index) => ({
        id: `category-${index}`,
        name: category.name,
        fieldId: category.field.id,
        feeds: [...(CATEGORIES[index]?.sources ?? [])],
    })),
    uncategorized: ['Daring Fireball', 'Austin Kleon'],
};

const COUNT_BY_ID = new Map(START_LIBRARY.categories.map((category, index) => [category.id, UNREAD_COUNTS[index]]));

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

const GUEST_TOOLS: CategoryTools = { add: <AddFeedLocked />, manage: <ManageLink href="/sign-up" locked /> };

// Renders the specimen: a mode switch, then the framed shell. Reader mode is on Frontend, guest mode on All items.
export function AppShellDemo() {
    const [mode, setMode] = useState<DemoMode>('reader');
    const [library, setLibrary] = useState(START_LIBRARY);
    const [isManaging, setIsManaging] = useState(false);
    const [toast, setToast] = useState<DemoToast | null>(null);
    const isReader = mode === 'reader';
    const homeHref = isReader ? '#patterns' : THIS_PAGE;
    const readerNav = library.categories.map((category) => ({
        href: categoryHref(category.id),
        name: category.name,
        color: (categoryFieldById(category.fieldId) ?? NO_FIELD).color,
        count: COUNT_BY_ID.get(category.id),
    })) satisfies ShellCategory[];
    const categories = isReader ? readerNav : GUEST_NAV;
    const account = isReader ? <AccountMenu user={SAMPLE_READER} /> : <GuestMenu />;
    const firstCategory = library.categories.find((category) => category.id === FIRST_CATEGORY);
    const title = isReader ? (firstCategory?.name ?? 'Frontend') : 'All items';
    const titleField = isReader ? (categoryFieldById(firstCategory?.fieldId) ?? NO_FIELD).color : 'var(--color-field-lemon)';
    const items = isReader ? SAMPLE_ITEMS.filter((item) => item.category === 'frontend') : SAMPLE_ITEMS.slice(0, 4);

    // Applies an edit and says what changed, keeping the library before it for Undo when the edit can be taken back.
    function change(next: Library, message: string, undoable = true) {
        setToast({ message, undo: undoable ? library : null });
        setLibrary(next);
    }

    // Puts the library back as it was before the last edit.
    function undo(previous: Library | null) {
        if (previous) {
            setLibrary(previous);
        }
        setToast(null);
    }

    // Opens the Manage page in the workspace instead of following the link.
    function openManage(event?: MouseEvent<HTMLAnchorElement>) {
        event?.preventDefault();
        setIsManaging(true);
    }

    const readerTools: CategoryTools = {
        add: (
            <AddFeed
                categories={library.categories}
                onAdd={(address, categoryId) => {
                    const name = address.hostname.replace(/^www\./, '');
                    const where = library.categories.find((category) => category.id === categoryId)?.name ?? 'Uncategorized';
                    change(placeFeed(library, name, categoryId), `Added ${name} to ${where}.`);
                }}
            />
        ),
        manage: <ManageLink href="#manage" onClick={openManage} />,
        rowMenu: (shellCategory) => {
            const category = library.categories.find((candidate) => categoryHref(candidate.id) === shellCategory.href);
            if (!category) {
                return null;
            }
            return (
                <CategoryRowMenu
                    category={category}
                    onRename={(name) => {
                        if (name.trim() === '') {
                            return 'Give it a name.';
                        }
                        if (isNameTaken(library, name, category.id)) {
                            return `You already have a category called ${name.trim()}.`;
                        }
                        change(updateCategory(library, category.id, { name: name.trim() }), `Renamed ${category.name} to ${name.trim()}.`);
                        return undefined;
                    }}
                    onRecolor={(fieldId) =>
                        change(updateCategory(library, category.id, { fieldId }), `${category.name} is now ${categoryFieldById(fieldId)?.name}.`)
                    }
                    onManage={() => openManage()}
                    onDelete={() => change(deleteCategory(library, category.id), `Deleted ${category.name}. Its feeds are in Uncategorized.`)}
                />
            );
        },
    };
    const tools = isReader ? readerTools : GUEST_TOOLS;

    return (
        <div className="flex flex-col gap-4">
            <div className="max-w-xs">
                <ChoiceControl name="shell-demo-mode" legend="Show the shell" options={MODE_OPTIONS} value={mode} onChange={setMode} />
            </div>
            <div className="relative flex h-[40rem] overflow-hidden rounded-panel border border-edge bg-workspace">
                <ShellSidebar
                    homeHref={homeHref}
                    views={VIEWS}
                    categories={categories}
                    panelId={PANEL_ID}
                    account={account}
                    tools={tools}
                    className="hidden flex-none lg:grid"
                />
                <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                    <ShellToolbar
                        homeHref={homeHref}
                        views={VIEWS}
                        categories={categories}
                        drawer={
                            <ShellDrawer>
                                <ShellNav homeHref={homeHref} views={VIEWS} categories={categories} account={account} tools={tools} />
                            </ShellDrawer>
                        }
                        utilities={<ReaderSettings />}
                        search={searchSamples}
                    />
                    {isReader && isManaging ? (
                        <div className="px-5 pt-8 pb-10 sm:px-8">
                            <button
                                type="button"
                                onClick={() => setIsManaging(false)}
                                className="mb-6 flex min-h-11 items-center gap-2 text-ui font-semibold text-ink-2 hover:text-ink"
                            >
                                <Icon name="back" />
                                Back to {title}
                            </button>
                            <ManageCategories library={library} onChange={change} />
                        </div>
                    ) : (
                        <div className="px-5 pt-8 pb-10 sm:px-8">
                            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                                <span
                                    className="type-display underline decoration-[0.12em] underline-offset-[0.14em] [text-decoration-skip-ink:none]"
                                    style={{ textDecorationColor: titleField }}
                                >
                                    {title}
                                </span>
                                <span className="text-ui font-semibold text-ink-2 tabular-nums">
                                    {isReader ? '12 unread · 6 feeds' : '37 unread · 19 feeds'}
                                </span>
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
                    )}
                </div>
                <div role="status" className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center *:pointer-events-auto">
                    {toast && (
                        <Toast key={toast.message} onUndo={toast.undo ? () => undo(toast.undo) : undefined} onDismiss={() => setToast(null)}>
                            {toast.message}
                        </Toast>
                    )}
                </div>
            </div>
        </div>
    );
}

// Returns a sample category's link: this page for the first, so the matcher marks it current, an anchor for the rest.
function categoryHref(id: string): string {
    return id === FIRST_CATEGORY ? THIS_PAGE : `#${id}`;
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
