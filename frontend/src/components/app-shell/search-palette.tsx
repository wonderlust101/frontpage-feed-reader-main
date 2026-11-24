'use client';

// Search, the shell's one global utility: a button in the workspace toolbar and Ctrl/Cmd + K from anywhere open a
// command palette (a native modal <dialog>) to find articles and sources, optionally within one category. The query
// field is a combobox: arrow keys move through the results, Enter opens one, Escape closes. With no `search` function
// (no articles or sources to search yet) it says so plainly instead of pretending to look.

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { Capsule } from '@/components/ui/capsule';
import { Icon } from '@/components/ui/icon';
import type { ShellCategory } from './nav-entries';
import { matchParts } from './search-match';

export type SearchResults = {
    articles: { href: string; title: string; source: string; time: string }[];
    sources: { href: string; name: string; detail: string }[];
};

type SearchPaletteProps = {
    categories: ShellCategory[];
    search?: (query: string, categoryHref: string | null) => SearchResults;
};

type ResultOption = { href: string; title: string; detail: string; aside?: string; initial: string };

const ALL_FIELD = { color: 'var(--color-field-lemon)', onColor: 'var(--color-on-field)' };

const NO_RESULTS: SearchResults = { articles: [], sources: [] };

// Renders the toolbar's search button and the palette; `search` answers a query within a category (null for all).
export function SearchPalette({ categories, search }: SearchPaletteProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const router = useRouter();
    const listId = useId();
    const isMac = useSyncExternalStore(subscribeToNothing, isApplePlatform, () => false);
    const [query, setQuery] = useState('');
    const [categoryHref, setCategoryHref] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const trimmedQuery = query.trim();
    const results = search && trimmedQuery ? search(trimmedQuery, categoryHref) : NO_RESULTS;
    const articleOptions: ResultOption[] = results.articles.map((article) => ({
        href: article.href,
        title: article.title,
        detail: article.source,
        aside: article.time,
        initial: article.source.charAt(0),
    }));
    const sourceOptions: ResultOption[] = results.sources.map((source) => ({
        href: source.href,
        title: source.name,
        detail: source.detail,
        initial: source.name.charAt(0),
    }));
    const options = [...articleOptions, ...sourceOptions];
    const activeOption = options[Math.min(activeIndex, options.length - 1)];
    const shortcut = isMac ? '⌘K' : 'Ctrl K';

    useEffect(() => {
        // Opens the palette on Ctrl/Cmd + K anywhere, taking the shortcut from the browser's own use of it.
        function openOnShortcut(event: globalThis.KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                dialogRef.current?.showModal();
            }
        }
        window.addEventListener('keydown', openOnShortcut);
        return () => window.removeEventListener('keydown', openOnShortcut);
    }, []);

    // Opens the chosen result and closes the palette.
    function openResult(option: ResultOption) {
        dialogRef.current?.close();
        router.push(option.href);
    }

    // Moves through the results with the arrow keys (wrapping at either end) and opens the active one on Enter.
    function moveOrOpen(event: KeyboardEvent<HTMLInputElement>) {
        if (options.length === 0) {
            return;
        }
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
                type="button"
                aria-haspopup="dialog"
                aria-keyshortcuts="Meta+K Control+K"
                onClick={() => dialogRef.current?.showModal()}
                className="tool-button max-w-full min-w-0 shrink justify-start text-ink-2 md:w-88 md:px-3"
            >
                <Icon name="search" />
                <span className="truncate font-medium @max-lg:sr-only">Search articles and sources</span>
                <kbd className="ml-auto rounded-tag border border-edge bg-workspace px-1.5 text-meta font-semibold whitespace-nowrap text-ink-2 max-md:hidden">
                    {shortcut}
                </kbd>
            </button>
            <dialog
                ref={dialogRef}
                aria-label="Search"
                onClick={(event) => event.target === event.currentTarget && event.currentTarget.close()}
                className="mx-auto mt-[12vh] max-h-[76dvh] w-[min(40rem,calc(100vw-1.5rem))] overflow-hidden rounded-stage border-[1.5px] border-control-edge bg-workspace p-0 text-ink transition-[opacity,scale,display,overlay] transition-discrete duration-150 ease-out backdrop:bg-on-field/45 starting:open:scale-97 starting:open:opacity-0 max-md:mt-3"
            >
                <div className="flex max-h-[76dvh] flex-col">
                    <div className="flex items-center gap-3 border-b border-edge px-4 has-[.palette-input:focus-visible]:shadow-[inset_0_-2px_0_var(--color-ink)]">
                        <Icon name="search" className="text-ink-2" />
                        <input
                            type="text"
                            role="combobox"
                            enterKeyHint="search"
                            aria-label="Search articles and sources"
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
                            placeholder="Search articles and sources"
                            className="palette-input h-14 min-w-0 flex-1 bg-transparent text-[1.0625rem] placeholder:text-muted"
                        />
                        <kbd className="rounded-tag border border-edge px-1.5 text-meta font-semibold text-ink-2">Esc</kbd>
                    </div>
                    {categories.length > 0 && (
                        <div role="group" aria-label="Search in" className="flex flex-wrap gap-2 border-b border-edge px-4 py-3">
                            <Capsule field={ALL_FIELD} on={categoryHref === null} onClick={() => setCategoryHref(null)}>
                                All
                            </Capsule>
                            {categories.map((category) => (
                                <Capsule
                                    key={category.href}
                                    field={{ color: category.color, onColor: 'var(--color-on-field)' }}
                                    on={categoryHref === category.href}
                                    onClick={() => setCategoryHref(categoryHref === category.href ? null : category.href)}
                                >
                                    {category.name}
                                </Capsule>
                            ))}
                        </div>
                    )}
                    <div className="min-h-0 flex-1 overflow-y-auto py-2">
                        {options.length > 0 ? (
                            <ul id={listId} role="listbox" aria-label="Results">
                                {renderGroup('Articles', articleOptions, 0)}
                                {renderGroup('Sources', sourceOptions, articleOptions.length)}
                            </ul>
                        ) : (
                            renderEmpty()
                        )}
                    </div>
                    <p className="flex gap-4 border-t border-edge px-4 py-2.5 text-meta text-muted">
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
    function renderGroup(label: string, groupOptions: ResultOption[], offset: number) {
        if (groupOptions.length === 0) {
            return null;
        }
        return (
            <li role="presentation">
                <p className="px-4 pt-2 pb-1 text-meta font-semibold text-muted">{label}</p>
                <ul role="group" aria-label={label}>
                    {groupOptions.map((option, index) => {
                        const isActive = option === activeOption;
                        return (
                            <li
                                key={option.href}
                                id={`${listId}-${offset + index}`}
                                role="option"
                                aria-selected={isActive}
                                onClick={() => openResult(option)}
                                onMouseMove={() => setActiveIndex(offset + index)}
                                className={`flex cursor-pointer items-center gap-3 px-4 py-2 ${isActive ? 'bg-ground-2' : ''}`}
                            >
                                <span
                                    aria-hidden="true"
                                    className="grid size-6 flex-none place-items-center rounded-tag bg-panel text-[0.75rem] font-bold text-ink-2"
                                >
                                    {option.initial}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-ui font-medium">
                                        {matchParts(option.title, trimmedQuery).map((part, partIndex) =>
                                            part.isMatch ? (
                                                <mark key={partIndex} className="bg-field-lemon/55 text-inherit">
                                                    {part.text}
                                                </mark>
                                            ) : (
                                                part.text
                                            ),
                                        )}
                                    </span>
                                    <span className="block truncate text-meta text-muted">{option.detail}</span>
                                </span>
                                {option.aside && <span className="flex-none text-meta text-muted tabular-nums">{option.aside}</span>}
                            </li>
                        );
                    })}
                </ul>
            </li>
        );
    }

    // Says why there is nothing to show: nothing to search yet, nothing typed, or no match (with a way to widen it).
    function renderEmpty() {
        const [title, hint] = !search
            ? ['Nothing to search yet', 'Once your feeds are in, every article and source turns up here as you type.']
            : !trimmedQuery
              ? ['Find articles and sources', 'Type a title, a source or a topic.']
              : [`Nothing matches “${trimmedQuery}”`, categoryHref ? 'Try every category, or fewer letters.' : 'Try fewer letters, or another word.'];
        return (
            <div role="status" className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <Icon name={search && trimmedQuery ? 'no-results' : 'search'} size="nav" className="text-ink-2" />
                <p className="font-display text-title font-semibold tracking-[-0.015em]">{title}</p>
                <p className="max-w-80 text-ui text-ink-2">{hint}</p>
                {search && trimmedQuery && categoryHref && (
                    <button type="button" onClick={() => setCategoryHref(null)} className="tool-button mt-2">
                        Search every category
                    </button>
                )}
            </div>
        );
    }
}

// Renders one keycap in the palette's footer.
function Keycap({ children }: { children: string }) {
    return <kbd className="rounded-tag border border-edge px-1.5 font-semibold text-ink-2">{children}</kbd>;
}

// Subscribes to nothing: the platform never changes while the page is open.
function subscribeToNothing() {
    return () => {};
}

// Returns true on Apple platforms, where the shortcut is ⌘K rather than Ctrl K.
function isApplePlatform() {
    return /Mac|iPhone|iPad/.test(navigator.platform);
}
