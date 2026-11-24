'use client';

// The app shell at specimen scale, built from the same parts as the real shell (rail, category panel, toolbar, drawer)
// with sample data: categories with counts, a signed-in reader or a guest, and a search palette that searches the
// sample items and sources. Each category row's quick actions work here: a reader renames, recolors and deletes on a
// sample library, with Undo in a toast (or Ctrl/⌘ + Z); a guest recolors, saved on this device like the real guest
// shell. Readers get these in the app when the categories endpoints exist. One view and one category link to this
// page, so the matcher marks them current.

import { useEffect, useState, type CSSProperties } from 'react';
import type { ShellCategory, ShellView } from '@/components/app-shell/nav-entries';
import type { SearchResults } from '@/components/app-shell/search-palette';
import { ShellDrawer } from '@/components/app-shell/shell-drawer';
import { ShellNav } from '@/components/app-shell/shell-nav';
import { ShellSidebar } from '@/components/app-shell/shell-sidebar';
import { ShellToolbar } from '@/components/app-shell/shell-toolbar';
import { Toast } from '@/components/ui/toast';
import { ACCOUNT_FEATURE_VIEWS } from '@/features/auth/account-features';
import { AccountMenu } from '@/features/auth/components/account-menu';
import { GuestMenu } from '@/features/auth/components/guest-menu';
import { CategoryRowMenu } from '@/features/categories/components/category-row-menu';
import { categoryColor } from '@/features/categories/category-field-vars';
import { NO_FIELD, categoryFieldById } from '@/features/categories/fields';
import { deleteCategory, isNameTaken, updateCategory, type Library } from '@/features/categories/library';
import { useGuestCategoryFields } from '@/features/categories/use-guest-category-fields';
import { FeedItemRow } from '@/features/items/components/feed-item-row';
import { ChoiceControl } from '@/features/preferences/components/choice-control';
import { CATEGORIES, READER_CATEGORIES, SAMPLE_ITEMS, SAMPLE_READER, getCategory, type CategoryId } from '../_data/sample-data';

type DemoMode = 'reader' | 'guest';

type DemoToast = { message: string; undo: Library };

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
    { href: '#reading', label: 'Reading stats', icon: 'analytics' },
] satisfies ShellView[];

const GUEST_VIEWS = [{ href: THIS_PAGE, label: 'All items', icon: 'all-items' }, ...ACCOUNT_FEATURE_VIEWS] satisfies ShellView[];

const FIRST_CATEGORY = 'category-0';

const START_LIBRARY: Library = {
    categories: READER_CATEGORIES.map((category, index) => ({
        id: `category-${index}`,
        name: category.name,
        fieldId: category.field.id,
        feeds: [...(CATEGORIES[index]?.sources ?? [])],
    })),
    uncategorized: [],
};

const COUNT_BY_ID = new Map(START_LIBRARY.categories.map((category, index) => [category.id, UNREAD_COUNTS[index]]));

const CATEGORY_BY_HREF = new Map<string, CategoryId>([
    [THIS_PAGE, 'frontend'],
    ...CATEGORIES.map((category): [string, CategoryId] => [`#category-${category.id}`, category.id]),
    ...CATEGORIES.map((category, index): [string, CategoryId] => [`#category-${index}`, category.id]),
]);

// Renders the specimen: a mode switch, then the framed shell. Reader mode is on Frontend, guest mode on All items.
export function AppShellDemo() {
    const [mode, setMode] = useState<DemoMode>('reader');
    const [library, setLibrary] = useState(START_LIBRARY);
    const [toast, setToast] = useState<DemoToast | null>(null);
    const [guestFields, chooseGuestField] = useGuestCategoryFields();
    const isReader = mode === 'reader';
    const homeHref = isReader ? '#patterns' : THIS_PAGE;
    const views = isReader ? VIEWS : GUEST_VIEWS;
    const categories = isReader
        ? library.categories.map((category) => ({
                href: categoryHref(category.id),
                name: category.name,
                color: (categoryFieldById(category.fieldId) ?? NO_FIELD).color,
                count: COUNT_BY_ID.get(category.id),
            }))
        : CATEGORIES.map((category, index) => ({
                href: `#category-${category.id}`,
                name: category.name,
                color: categoryColor(category.id, category.field.color),
                count: UNREAD_COUNTS[index],
            }));
    const account = isReader ? <AccountMenu user={SAMPLE_READER} /> : <GuestMenu />;
    const firstCategory = library.categories.find((category) => category.id === FIRST_CATEGORY);
    const title = isReader ? (firstCategory?.name ?? 'Frontend') : 'All items';
    const titleField = isReader ? (categoryFieldById(firstCategory?.fieldId) ?? NO_FIELD).color : 'var(--color-field-lemon)';
    const items = isReader ? SAMPLE_ITEMS.filter((item) => item.category === 'frontend') : SAMPLE_ITEMS.slice(0, 4);

    useEffect(() => {
        // Takes the last edit back on Ctrl/⌘ + Z while its toast shows, outside text fields.
        function undoOnShortcut(event: KeyboardEvent) {
            const inField = event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]');
            if (toast && !inField && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                undo(toast.undo);
            }
        }
        window.addEventListener('keydown', undoOnShortcut);
        return () => window.removeEventListener('keydown', undoOnShortcut);
    }, [toast]);

    // Applies an edit and says what changed, keeping the library before it for Undo.
    function change(next: Library, message: string) {
        setToast({ message, undo: library });
        setLibrary(next);
    }

    // Puts the library back as it was before the last edit.
    function undo(previous: Library) {
        setLibrary(previous);
        setToast(null);
    }

    // Renders a row's quick actions: rename, recolor and delete for a reader, recolor for a guest.
    function rowMenu(shellCategory: ShellCategory) {
        if (!isReader) {
            const guestCategory = CATEGORIES.find((entry) => `#category-${entry.id}` === shellCategory.href);
            return (
                guestCategory && (
                    <CategoryRowMenu
                        category={{ name: guestCategory.name, fieldId: guestFields[guestCategory.id].id }}
                        onRecolor={(fieldId) => chooseGuestField(guestCategory.id, fieldId)}
                    />
                )
            );
        }
        const category = library.categories.find((candidate) => categoryHref(candidate.id) === shellCategory.href);
        return (
            category && (
                <CategoryRowMenu
                    category={category}
                    onRecolor={(fieldId) =>
                        change(updateCategory(library, category.id, { fieldId }), `${category.name} is now ${categoryFieldById(fieldId)?.name}.`)
                    }
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
                    onDelete={() => change(deleteCategory(library, category.id), `Deleted ${category.name}.`)}
                />
            )
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="max-w-xs">
                <ChoiceControl name="shell-demo-mode" legend="Show the shell" options={MODE_OPTIONS} value={mode} onChange={setMode} />
            </div>
            <div className="relative flex h-[40rem] overflow-hidden rounded-panel border border-edge bg-workspace">
                <ShellSidebar
                    homeHref={homeHref}
                    views={views}
                    categories={categories}
                    panelId={PANEL_ID}
                    account={account}
                    rowMenu={rowMenu}
                    className="hidden flex-none lg:grid"
                />
                <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                    <ShellToolbar
                        homeHref={homeHref}
                        views={views}
                        categories={categories}
                        drawer={
                            <ShellDrawer>
                                <ShellNav homeHref={homeHref} views={views} categories={categories} account={account} rowMenu={rowMenu} />
                            </ShellDrawer>
                        }
                        search={searchSamples}
                    />
                    <div className="px-5 pt-8 pb-10 sm:px-8">
                        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                            <span
                                className="field-underline type-display underline decoration-[0.12em] underline-offset-[0.14em] [text-decoration-skip-ink:none]"
                                style={{ '--title-field': titleField } as CSSProperties}
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
                <div role="status" className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center *:pointer-events-auto">
                    {toast && (
                        <Toast key={toast.message} onUndo={() => undo(toast.undo)} onDismiss={() => setToast(null)}>
                            {toast.message}
                            <span className="sr-only"> Press Control or Command Z to undo.</span>
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
