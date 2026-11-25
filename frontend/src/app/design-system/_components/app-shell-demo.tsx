'use client';

// The app shell at specimen scale, built from the real shell's parts with sample data. One view and one category
// link to this page, so the matcher marks them current.

import { useEffect, useState } from 'react';
import type { ShellCategory, ShellView } from '@/components/app-shell/nav-entries';
import type { SearchResults } from '@/components/app-shell/search-results';
import { ShellDrawer } from '@/components/app-shell/shell-drawer';
import { ShellNav } from '@/components/app-shell/shell-nav';
import { ShellSidebar } from '@/components/app-shell/shell-sidebar';
import { ShellToolbar } from '@/components/app-shell/shell-toolbar';
import { FieldTitle } from '@/components/ui/field-title';
import { Toast } from '@/components/ui/toast';
import { ACCOUNT_FEATURE_VIEWS } from '@/features/auth/account-features';
import { AccountMenu } from '@/features/auth/components/account-menu';
import { GuestMenu } from '@/features/auth/components/guest-menu';
import { categoryColor } from '@/features/categories/category-field-vars';
import { CategoryRowMenu } from '@/features/categories/components/category-row-menu';
import { BRAND_FIELD, categoryFieldById, fieldOrNone } from '@/features/categories/fields';
import type { GuestCategoryId } from '@/features/categories/guest-categories';
import { useGuestCategoryFields } from '@/features/categories/hooks/use-guest-category-fields';
import { deleteCategory, isNameTaken, updateCategory, type Library, type LibraryCategory } from '@/features/categories/library';
import { ChoiceControl } from '@/features/preferences/components/choice-control';
import { isTypingTarget } from '@/lib/typing-target';
import { CATEGORIES, READER_CATEGORIES, SAMPLE_ITEMS, SAMPLE_READER } from '../_data/sample-data';
import { SampleItemRow } from './sample-item-row';

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

// Reader category i is named after sample category i and takes its feeds, so search can scope a reader row to it.
const READER_SAMPLES = READER_CATEGORIES.map((category, index) => ({ id: `category-${index}`, category, sample: CATEGORIES[index] }));

const START_LIBRARY: Library = {
    categories: READER_SAMPLES.map(({ id, category, sample }) => ({
        id,
        name: category.name,
        fieldId: category.field.id,
        feeds: [...(sample?.sources ?? [])],
    })),
    uncategorized: [],
};

const COUNT_BY_ID = new Map(START_LIBRARY.categories.map((category, index) => [category.id, UNREAD_COUNTS[index]]));

const SAMPLE_BY_HREF = new Map<string, GuestCategoryId>([
    ...CATEGORIES.map((category): [string, GuestCategoryId] => [sampleCategoryHref(category.id), category.id]),
    ...READER_SAMPLES.flatMap(({ id, sample }): [string, GuestCategoryId][] => (sample ? [[readerCategoryHref(id), sample.id]] : [])),
]);

export function AppShellDemo() {
    const [mode, setMode] = useState<DemoMode>('reader');
    const { library, toast, applyEdit, undo, dismissToast } = useUndoableLibrary();
    const [guestFields, chooseGuestField] = useGuestCategoryFields();
    const shell = demoShell(mode, library);

    function guestRowMenu(shellCategory: ShellCategory) {
        const category = CATEGORIES.find((entry) => sampleCategoryHref(entry.id) === shellCategory.href);

        if (!category)
            return null;

        return (
            <CategoryRowMenu
                category={{ name: category.name, fieldId: guestFields[category.id].id }}
                onRecolor={(fieldId) => chooseGuestField(category.id, fieldId)}
            />
        );
    }

    function renameCategory(category: LibraryCategory, name: string) {
        const newName = name.trim();
        const problem = renameProblem(library, category.id, newName);

        if (problem)
            return problem;

        applyEdit(updateCategory(library, category.id, { name: newName }), `Renamed ${category.name} to ${newName}.`);

        return undefined;
    }

    function readerRowMenu(shellCategory: ShellCategory) {
        const category = library.categories.find((candidate) => readerCategoryHref(candidate.id) === shellCategory.href);

        if (!category)
            return null;

        return (
            <CategoryRowMenu
                category={category}
                onRecolor={(fieldId) => applyEdit(updateCategory(library, category.id, { fieldId }), `${category.name} is now ${categoryFieldById(fieldId)?.name}.`)}
                onRename={(name) => renameCategory(category, name)}
                onDelete={() => applyEdit(deleteCategory(library, category.id), `Deleted ${category.name}.`)}
            />
        );
    }

    const rowMenu = mode === 'reader' ? readerRowMenu : guestRowMenu;

    return (
        <div className="flex flex-col gap-4">
            <div className="max-w-xs">
                <ChoiceControl name="shell-demo-mode" legend="Show the shell" options={MODE_OPTIONS} value={mode} onChange={setMode} />
            </div>
            <div className="relative flex h-[40rem] overflow-hidden rounded-panel border border-edge bg-workspace">
                <ShellSidebar
                    homeHref={shell.homeHref}
                    views={shell.views}
                    categories={shell.categories}
                    panelId={PANEL_ID}
                    account={shell.account}
                    rowMenu={rowMenu}
                    className="hidden flex-none lg:grid"
                />
                <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                    <ShellToolbar
                        homeHref={shell.homeHref}
                        views={shell.views}
                        categories={shell.categories}
                        drawer={
                            <ShellDrawer>
                                <ShellNav
                                    homeHref={shell.homeHref}
                                    views={shell.views}
                                    categories={shell.categories}
                                    account={shell.account}
                                    rowMenu={rowMenu}
                                />
                            </ShellDrawer>
                        }
                        search={searchSamples}
                    />
                    <div className="px-5 pt-8 pb-10 sm:px-8">
                        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                            <FieldTitle color={shell.titleColor} className="type-display underline-offset-[0.14em]">
                                {shell.title}
                            </FieldTitle>
                            <span className="text-ui font-semibold text-ink-2 tabular-nums">{shell.summary}</span>
                        </p>
                        <ul className="mt-6 rule-t">
                            {shell.items.map((item, index) => (
                                <SampleItemRow key={item.id} item={item} href="#patterns" isSelected={index === 0} />
                            ))}
                        </ul>
                    </div>
                </div>
                <div role="status" className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center *:pointer-events-auto">
                    {toast && (
                        <Toast key={toast.message} onUndo={() => undo(toast.undo)} onDismiss={dismissToast}>
                            {toast.message}
                            <span className="sr-only"> Press Control or Command Z to undo.</span>
                        </Toast>
                    )}
                </div>
            </div>
        </div>
    );
}

// The sample library with one step of Undo: a toast after each edit, and Ctrl/⌘ + Z while it shows.
function useUndoableLibrary() {
    const [library, setLibrary] = useState(START_LIBRARY);
    const [toast, setToast] = useState<DemoToast | null>(null);

    function applyEdit(next: Library, message: string) {
        setToast({ message, undo: library });
        setLibrary(next);
    }

    function undo(previous: Library) {
        setLibrary(previous);
        setToast(null);
    }

    function dismissToast() {
        setToast(null);
    }

    useEffect(() => {
        // Outside text fields only, so Ctrl/⌘ + Z still undoes typing.
        function undoOnShortcut(event: KeyboardEvent) {
            if (toast && !isTypingTarget(event.target) && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                undo(toast.undo);
            }
        }

        window.addEventListener('keydown', undoOnShortcut);

        return () => window.removeEventListener('keydown', undoOnShortcut);
    }, [toast]);

    return { library, toast, applyEdit, undo, dismissToast };
}

// Everything that differs between the signed-in and the guest specimen.
function demoShell(mode: DemoMode, library: Library) {
    if (mode === 'guest') {
        return {
            homeHref: THIS_PAGE,
            views: GUEST_VIEWS,
            categories: CATEGORIES.map((category, index) => ({
                href: sampleCategoryHref(category.id),
                name: category.name,
                color: categoryColor(category.id, category.field.color),
                count: UNREAD_COUNTS[index],
            })),
            account: <GuestMenu />,
            title: 'All items',
            titleColor: BRAND_FIELD.color,
            summary: '37 unread · 19 feeds',
            items: SAMPLE_ITEMS.slice(0, 4),
        };
    }

    const firstCategory = library.categories.find((category) => category.id === FIRST_CATEGORY);

    return {
        homeHref: '#patterns',
        views: VIEWS,
        categories: library.categories.map((category) => ({
            href: readerCategoryHref(category.id),
            name: category.name,
            color: fieldOrNone(category.fieldId).color,
            count: COUNT_BY_ID.get(category.id),
        })),
        account: <AccountMenu user={SAMPLE_READER} />,
        title: firstCategory?.name ?? 'Frontend',
        titleColor: fieldOrNone(firstCategory?.fieldId).color,
        summary: '12 unread · 6 feeds',
        items: SAMPLE_ITEMS.filter((item) => item.category === 'frontend'),
    };
}

function renameProblem(library: Library, categoryId: LibraryCategory['id'], newName: string): string | undefined {
    if (newName === '')
        return 'Give it a name.';

    if (isNameTaken(library, newName, categoryId))
        return `You already have a category called ${newName}.`;

    return undefined;
}

function sampleCategoryHref(id: GuestCategoryId): string {
    return `#category-${id}`;
}

// This page for the first category, so the matcher marks it current; an anchor for the rest.
function readerCategoryHref(id: string): string {
    return id === FIRST_CATEGORY ? THIS_PAGE : `#${id}`;
}

function searchSamples(query: string, scopeHref: string | null): SearchResults {
    const needle = query.toLowerCase();
    const scopeId = scopeHref ? SAMPLE_BY_HREF.get(scopeHref) : undefined;

    function inScope(id: GuestCategoryId) {
        return !scopeHref || id === scopeId;
    }

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
                .map((source) => ({ href: '#patterns', name: source, detail: category.name, categoryHref: sampleCategoryHref(category.id) })),
        ),
    };
}
