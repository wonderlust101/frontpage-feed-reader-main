'use client';

// Search, the shell's one global utility: Ctrl/Cmd + K or the toolbar button opens a native modal <dialog> that both
// searches and navigates. The "Search in" select sits in the query's own row, so the results never move.

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type MouseEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import type { ShellCategory, ShellView } from './nav-entries';
import { matchParts } from './search-match';
import { buildResultGroups, type ResultGroup, type ResultOption, type SearchFn, type SearchSource } from './search-results';
import { useShellPlace } from './use-shell-place';

type SearchPaletteProps = {
    homeHref: string;
    views: ShellView[];
    categories: ShellCategory[];
    sources?: SearchSource[];
    search?: SearchFn;
};

export function SearchPalette({ homeHref, views, categories, sources = [], search }: SearchPaletteProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const listId = useId();
    const scopeId = useId();
    const isMac = useSyncExternalStore(subscribeToNothing, isApplePlatform, () => false);
    const [query, setQuery] = useState('');
    const [scopeHref, setScopeHref] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const place = useShellPlace(homeHref, views, categories);
    const currentCategoryHref = place.category !== homeHref ? place.category : null;
    const trimmedQuery = query.trim();
    const searched = search && trimmedQuery ? search(trimmedQuery, scopeHref) : null;
    const groups = buildResultGroups({ query, views, categories, sources, searched, scopeHref, currentCategoryHref });
    const options = groups.flatMap((group) => group.options);

    // The list can shrink under a kept index (a new scope), so the active row is clamped to it.
    const activePosition = Math.min(activeIndex, options.length - 1);
    const activeOption = options[activePosition];
    const shortcut = isMac ? '⌘K' : 'Ctrl K';

    // Selects the last query, so typing starts a new search.
    function openPalette() {
        dialogRef.current?.showModal();
        inputRef.current?.select();
    }

    useEffect(() => {
        function openOnShortcut(event: globalThis.KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                openPalette();
            }
        }

        window.addEventListener('keydown', openOnShortcut);

        return () => window.removeEventListener('keydown', openOnShortcut);
    }, []);

    function openResult(option: ResultOption) {
        dialogRef.current?.close();
        router.push(option.href);
    }

    // Arrow keys wrap at either end.
    function moveOrOpen(event: KeyboardEvent<HTMLInputElement>) {
        if (options.length === 0)
            return;

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;

            setActiveIndex((activePosition + step + options.length) % options.length);
        } else if (event.key === 'Enter' && activeOption) {
            event.preventDefault();
            openResult(activeOption);
        }
    }

    function closeOnBackdropClick(event: MouseEvent<HTMLDialogElement>) {
        if (event.target === event.currentTarget)
            event.currentTarget.close();
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
                onClick={closeOnBackdropClick}
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
                            aria-activedescendant={activeOption ? `${listId}-${activeOption.index}` : undefined}
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
                                {groups.map((group) => (
                                    <ResultList
                                        key={group.label}
                                        group={group}
                                        listId={listId}
                                        query={trimmedQuery}
                                        activeIndex={activePosition}
                                        onOpen={openResult}
                                        onActivate={setActiveIndex}
                                    />
                                ))}
                            </ul>
                        ) : (
                            <NoResults
                                query={trimmedQuery}
                                scopeHref={scopeHref}
                                canSearchArticles={Boolean(search)}
                                onSearchEverywhere={() => setScopeHref(null)}
                            />
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
}

type ResultListProps = {
    group: ResultGroup;
    listId: string;
    query: string;
    activeIndex: number;
    onOpen: (option: ResultOption) => void;
    onActivate: (index: number) => void;
};

// The group's aria-label names it for screen readers; the visible label is for sighted readers.
function ResultList({ group, listId, query, activeIndex, onOpen, onActivate }: ResultListProps) {
    return (
        <li role="presentation">
            <p aria-hidden="true" className="px-4 pt-2 pb-1 text-meta font-semibold text-muted">
                {group.label}
            </p>
            <ul role="group" aria-label={group.label}>
                {group.options.map((option) => (
                    <li
                        key={`${group.label}-${option.href}-${option.title}`}
                        id={`${listId}-${option.index}`}
                        role="option"
                        aria-selected={option.index === activeIndex}
                        onClick={() => onOpen(option)}
                        onMouseMove={() => onActivate(option.index)}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${option.index === activeIndex ? 'bg-ground-2' : ''}`}
                    >
                        <ResultLead lead={option.lead} />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-ui font-medium">
                                <HighlightedText text={option.title} query={query} />
                            </span>
                            <span className="block truncate text-meta text-muted">{option.detail}</span>
                        </span>
                        {option.aside && <span className="flex-none text-meta text-muted">{option.aside}</span>}
                        {option.locked && <Icon name="locked" size="inline" className="flex-none text-ink-2" />}
                    </li>
                ))}
            </ul>
        </li>
    );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
    return matchParts(text, query).map((part, index) => {
        if (!part.isMatch)
            return part.text;

        return (
            <mark key={index} className="bg-field-lemon text-on-field">
                {part.text}
            </mark>
        );
    });
}

type NoResultsProps = {
    query: string;
    scopeHref: string | null;
    canSearchArticles: boolean;
    onSearchEverywhere: () => void;
};

// Says what to type before a query, or why nothing matched, with a way to widen a scoped search.
function NoResults({ query, scopeHref, canSearchArticles, onSearchEverywhere }: NoResultsProps) {
    let title: string;
    let hint: string;

    if (!query) {
        title = 'Jump anywhere';
        hint = canSearchArticles
            ? 'Type a view, a category, an article or a source.'
            : 'Type a view, a category or a source. Article search arrives with the feeds.';
    } else {
        title = `Nothing matches “${query}”`;
        hint = scopeHref ? 'Try every category, or fewer letters.' : 'Try fewer letters, or another word.';
    }

    return (
        <div role="status" className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Icon name={query ? 'no-results' : 'search'} size="nav" className="text-ink-2" />
            <p className="font-display text-title font-semibold tracking-[-0.015em]">{title}</p>
            <p className="max-w-80 text-ui text-ink-2">{hint}</p>
            {query && scopeHref && (
                <button type="button" onClick={onSearchEverywhere} className="tool-button mt-2">
                    Search every category
                </button>
            )}
        </div>
    );
}

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

function Keycap({ children }: { children: string }) {
    return <kbd className="rounded-tag border border-edge px-1.5 font-sans font-semibold text-ink-2">{children}</kbd>;
}

// The platform never changes while the page is open.
function subscribeToNothing() {
    return () => {};
}

function isApplePlatform() {
    return /Mac|iPhone|iPad/.test(navigator.platform);
}
