'use client';

// Search, the shell's one global utility: a button in the workspace toolbar and Ctrl/Cmd + K from anywhere open a
// palette (a native modal <dialog>) that both searches and navigates. Typing finds views and categories to jump to
// ("Go to"), articles (when a `search` function is given) and sources (from `search`, or the plain `sources` list).
// Before anything is typed it lists every view and category, so arrow keys and Enter work at once. It searches
// everything, with the current category's sources first; once there is a query, a "Search in" select appears in the
// query's own row (so the results never move) and narrows articles and sources to one category when the reader wants
// that. Locked views (a guest's account-only ones) say so, with a lock. Reopening selects the last query, so typing
// replaces it. The query field is a combobox: arrow
// keys move through the results, Enter opens one, Escape (or Cancel on touch) closes.

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { shellPlace, type ShellCategory, type ShellView } from './nav-entries';
import { matchParts } from './search-match';

export type SearchResults = {
    articles: { href: string; title: string; source: string; time: string }[];
    sources: SearchSource[];
};

export type SearchSource = { href: string; name: string; detail: string; categoryHref: string };

type SearchPaletteProps = {
    homeHref: string;
    views: ShellView[];
    categories: ShellCategory[];
    sources?: SearchSource[];
    search?: (query: string, categoryHref: string | null) => SearchResults;
};

type ResultOption = {
    href: string;
    title: string;
    detail: string;
    aside?: string;
    locked?: boolean;
    lead: { icon: IconName } | { color: string } | { initial: string };
};

type ResultGroup = { label: string; options: ResultOption[] };

// Renders the toolbar's search button and the palette.
export function SearchPalette({ homeHref, views, categories, sources = [], search }: SearchPaletteProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const pathname = usePathname();
    const listId = useId();
    const scopeId = useId();
    const isMac = useSyncExternalStore(subscribeToNothing, isApplePlatform, () => false);
    const [query, setQuery] = useState('');
    const [scopeHref, setScopeHref] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const place = shellPlace(
        pathname,
        homeHref,
        views.map((view) => view.href),
        categories.map((category) => category.href),
    );
    const currentCategoryHref = place.category !== homeHref ? place.category : null;
    const trimmedQuery = query.trim();
    const needle = trimmedQuery.toLowerCase();
    const searched = search && trimmedQuery ? search(trimmedQuery, scopeHref) : null;
    const matchedSources = searched
        ? searched.sources
        : sources.filter((source) => needle && source.name.toLowerCase().includes(needle) && (!scopeHref || source.categoryHref === scopeHref));
    const scopedSources = [...matchedSources].sort((a, b) => Number(b.categoryHref === currentCategoryHref) - Number(a.categoryHref === currentCategoryHref));
    const groups: ResultGroup[] = [
        {
            label: 'Go to',
            options: [
                ...views
                    .filter((view) => view.label.toLowerCase().includes(needle))
                    .map((view) => ({
                        href: view.href,
                        title: view.label,
                        detail: view.preview ? 'View · with an account' : 'View',
                        locked: Boolean(view.preview),
                        lead: { icon: view.icon },
                    })),
                ...categories
                    .filter((category) => category.name.toLowerCase().includes(needle))
                    .map((category) => ({ href: category.href, title: category.name, detail: 'Category', lead: { color: category.color } })),
            ],
        },
        {
            label: 'Articles',
            options: (searched?.articles ?? []).map((article) => ({
                href: article.href,
                title: article.title,
                detail: article.source,
                aside: article.time,
                lead: { initial: article.source.charAt(0) },
            })),
        },
        {
            label: 'Sources',
            options: scopedSources.map((source) => ({
                href: source.href,
                title: source.name,
                detail: source.detail,
                lead: { initial: source.name.charAt(0) },
            })),
        },
    ];
    const options = groups.flatMap((group) => group.options);
    const activeOption = options[Math.min(activeIndex, options.length - 1)];
    const shortcut = isMac ? '⌘K' : 'Ctrl K';

    useEffect(() => {
        // Opens the palette on Ctrl/Cmd + K anywhere, taking the shortcut from the browser.
        function openOnShortcut(event: globalThis.KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                openPalette();
            }
        }
        window.addEventListener('keydown', openOnShortcut);

        return () => window.removeEventListener('keydown', openOnShortcut);
    }, []);

    // Opens the palette with the last query selected, so typing starts a new search.
    function openPalette() {
        dialogRef.current?.showModal();
        inputRef.current?.select();
    }

    // Opens the chosen result and closes the palette.
    function openResult(option: ResultOption) {
        dialogRef.current?.close();
        router.push(option.href);
    }

    // Moves through the results with the arrow keys (wrapping at either end) and opens the active one on Enter.
    function moveOrOpen(event: KeyboardEvent<HTMLInputElement>) {
        if (options.length === 0)
            return;

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;

            setActiveIndex((index) => (Math.min(index, options.length - 1) + step + options.length) % options.length);
        } else if (event.key === 'Enter' && activeOption) {
            event.preventDefault();
            openResult(activeOption);
        }
    }

    return (
        <>
            <button
                id="shell-search"
                type="button"
                aria-haspopup="dialog"
                aria-keyshortcuts="Meta+K Control+K"
                onClick={openPalette}
                className="tool-button flex-none justify-start text-ink-2 @max-lg:min-w-11 @lg:w-88 @lg:px-3"
            >
                <Icon name="search" />
                <span className="truncate font-medium @max-lg:sr-only">Search and jump</span>
                <kbd className="ml-auto rounded-tag border border-edge bg-workspace px-1.5 font-sans text-meta font-semibold whitespace-nowrap text-ink-2 @max-lg:hidden">
                    {shortcut}
                </kbd>
            </button>
            <dialog
                ref={dialogRef}
                aria-label="Search"
                onClick={(event) => event.target === event.currentTarget && event.currentTarget.close()}
                className="mx-auto mt-[10vh] max-h-[80dvh] w-[min(52rem,calc(100vw-1.5rem))] overflow-hidden rounded-stage border-[1.5px] border-control-edge bg-workspace p-0 text-ink transition-[opacity,scale,display,overlay] transition-discrete duration-150 ease-out backdrop:bg-on-field/45 starting:open:scale-97 starting:open:opacity-0 max-md:mt-3"
            >
                <div className="flex max-h-[80dvh] flex-col">
                    <div className="flex items-center gap-3 border-b border-edge px-4 has-[.palette-input:focus-visible]:shadow-[inset_0_-2px_0_var(--color-ink)]">
                        <Icon name="search" className="text-ink-2" />
                        <input
                            ref={inputRef}
                            type="text"
                            role="combobox"
                            enterKeyHint="search"
                            aria-label="Search and jump"
                            aria-expanded={options.length > 0}
                            aria-controls={listId}
                            aria-activedescendant={activeOption ? `${listId}-${options.indexOf(activeOption)}` : undefined}
                            autoComplete="off"
                            autoFocus
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setActiveIndex(0);
                            }}
                            onKeyDown={moveOrOpen}
                            placeholder="Views, categories, sources"
                            className="palette-input h-16 min-w-0 flex-1 bg-transparent text-body placeholder:text-muted"
                        />
                        {categories.length > 0 && trimmedQuery && (
                            <span className="flex max-w-[45%] flex-none items-center gap-2">
                                <label htmlFor={scopeId} className="text-meta font-semibold text-ink-2">
                                    in
                                </label>
                                <select
                                    id={scopeId}
                                    aria-label="Search in"
                                    value={scopeHref ?? ''}
                                    onChange={(event) => setScopeHref(event.target.value || null)}
                                    className="h-9 min-w-0 rounded-toggle border-[1.5px] border-control-edge bg-workspace px-2 text-meta font-semibold text-ink"
                                >
                                    <option value="">All categories</option>
                                    {categories.map((category) => (
                                        <option key={category.href} value={category.href}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </span>
                        )}
                        <kbd className="rounded-tag border border-edge px-1.5 font-sans text-meta font-semibold text-ink-2 pointer-coarse:hidden">Esc</kbd>
                        <button
                            type="button"
                            onClick={() => dialogRef.current?.close()}
                            className="min-h-11 text-ui font-semibold underline decoration-1 underline-offset-4 pointer-fine:hidden"
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto py-2 md:min-h-80">
                        {options.length > 0 ? (
                            <ul id={listId} role="listbox" aria-label="Results">
                                {groups.map((group, index) =>
                                    renderGroup(
                                        group,
                                        groups.slice(0, index).reduce((offset, earlier) => offset + earlier.options.length, 0),
                                    ),
                                )}
                            </ul>
                        ) : (
                            renderEmpty()
                        )}
                    </div>
                    <p className="flex gap-4 border-t border-edge px-4 py-2.5 text-meta text-muted pointer-coarse:hidden">
                        <span>
                            <Keycap>↑</Keycap> <Keycap>↓</Keycap> move
                        </span>
                        <span>
                            <Keycap>↵</Keycap> open
                        </span>
                        <span>
                            <Keycap>Esc</Keycap> close
                        </span>
                    </p>
                </div>
            </dialog>
        </>
    );

    // Renders one titled group of options, numbered from `offset` in the whole list so ids and the active row line up.
    // The visible label is for sighted readers; the group's aria-label names it for screen readers.
    function renderGroup({ label, options: groupOptions }: ResultGroup, offset: number) {
        if (groupOptions.length === 0)
            return null;

        return (
            <li key={label} role="presentation">
                <p aria-hidden="true" className="px-4 pt-2 pb-1 text-meta font-semibold text-muted">
                    {label}
                </p>
                <ul role="group" aria-label={label}>
                    {groupOptions.map((option, index) => {
                        const isActive = option === activeOption;

                        return (
                            <li
                                key={`${label}-${option.href}-${option.title}`}
                                id={`${listId}-${offset + index}`}
                                role="option"
                                aria-selected={isActive}
                                onClick={() => openResult(option)}
                                onMouseMove={() => setActiveIndex(offset + index)}
                                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${isActive ? 'bg-ground-2' : ''}`}
                            >
                                <ResultLead lead={option.lead} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-ui font-medium">
                                        {matchParts(option.title, trimmedQuery).map((part, partIndex) =>
                                            part.isMatch ? (
                                                <mark key={partIndex} className="bg-field-lemon text-on-field">
                                                    {part.text}
                                                </mark>
                                            ) : (
                                                part.text
                                            ),
                                        )}
                                    </span>
                                    <span className="block truncate text-meta text-muted">{option.detail}</span>
                                </span>
                                {option.aside && <span className="flex-none text-meta text-muted">{option.aside}</span>}
                                {option.locked && <Icon name="locked" size="inline" className="flex-none text-ink-2" />}
                            </li>
                        );
                    })}
                </ul>
            </li>
        );
    }

    // Says what to do or why there is nothing: a prompt before typing (noting article search when it doesn't exist yet),
    // or no match, with a way to widen the search when a category is chosen.
    function renderEmpty() {
        const [title, hint] = !trimmedQuery
            ? [
                    'Jump anywhere',
                    search ? 'Type a view, a category, an article or a source.' : 'Type a view, a category or a source. Article search arrives with the feeds.',
                ]
            : [`Nothing matches “${trimmedQuery}”`, scopeHref ? 'Try every category, or fewer letters.' : 'Try fewer letters, or another word.'];

        return (
            <div role="status" className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <Icon name={trimmedQuery ? 'no-results' : 'search'} size="nav" className="text-ink-2" />
                <p className="font-display text-title font-semibold tracking-[-0.015em]">{title}</p>
                <p className="max-w-80 text-ui text-ink-2">{hint}</p>
                {trimmedQuery && scopeHref && (
                    <button type="button" onClick={() => setScopeHref(null)} className="tool-button mt-2">
                        Search every category
                    </button>
                )}
            </div>
        );
    }
}

// Renders a result's lead: a view's icon, a category's field dot, or a source's initial on the panel tone.
function ResultLead({ lead }: { lead: ResultOption['lead'] }) {
    const box = 'grid size-7 flex-none place-items-center rounded-tag';

    if ('icon' in lead) {
        return (
            <span aria-hidden="true" className={`${box} text-ink-2`}>
                <Icon name={lead.icon} />
            </span>
        );
    }

    if ('color' in lead) {
        return (
            <span aria-hidden="true" className={box}>
                <span className="fill-edge size-3 rounded-full" style={{ background: lead.color }} />
            </span>
        );
    }

    return (
        <span aria-hidden="true" className={`${box} bg-panel text-meta font-bold text-ink-2`}>
            {lead.initial}
        </span>
    );
}

// Renders one keycap in the palette's footer.
function Keycap({ children }: { children: string }) {
    return <kbd className="rounded-tag border border-edge px-1.5 font-sans font-semibold text-ink-2">{children}</kbd>;
}

// Subscribes to nothing: the platform never changes while the page is open.
function subscribeToNothing() {
    return () => {};
}

// Returns true on Apple platforms, where the shortcut is ⌘K rather than Ctrl K.
function isApplePlatform() {
    return /Mac|iPhone|iPad/.test(navigator.platform);
}
