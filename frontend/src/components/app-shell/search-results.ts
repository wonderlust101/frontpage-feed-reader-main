// The search palette's results as plain data, grouped and numbered, so the palette only has to draw them.

import type { IconName } from '@/components/ui/icon';
import type { ShellCategory, ShellView } from './nav-entries';

export type SearchResults = {
    articles: { href: string; title: string; source: string; time: string }[];
    sources: SearchSource[];
};

export type SearchSource = { href: string; name: string; detail: string; categoryHref: string };

export type SearchFn = (query: string, categoryHref: string | null) => SearchResults;

export type ResultOption = {
    // Position in the whole list, across groups: what the active row and its element id use.
    index: number;
    href: string;
    title: string;
    detail: string;
    aside?: string;
    locked?: boolean;
    lead: { icon: IconName } | { color: string } | { initial: string };
};

export type ResultGroup = { label: string; options: ResultOption[] };

type ResultInput = {
    query: string;
    views: ShellView[];
    categories: ShellCategory[];
    sources: SearchSource[];
    searched: SearchResults | null;
    scopeHref: string | null;
    currentCategoryHref: string | null;
};

type UnnumberedOption = Omit<ResultOption, 'index'>;

// Groups with no options are left out. `searched` (from the shell's `search`) replaces the plain `sources` list when given.
export function buildResultGroups({ query, views, categories, sources, searched, scopeHref, currentCategoryHref }: ResultInput): ResultGroup[] {
    const needle = query.trim().toLowerCase();

    const viewOptions: UnnumberedOption[] = views
        .filter((view) => view.label.toLowerCase().includes(needle))
        .map((view) => ({
            href: view.href,
            title: view.label,
            detail: view.preview ? 'View · with an account' : 'View',
            locked: Boolean(view.preview),
            lead: { icon: view.icon },
        }));

    const categoryOptions: UnnumberedOption[] = categories
        .filter((category) => category.name.toLowerCase().includes(needle))
        .map((category) => ({ href: category.href, title: category.name, detail: 'Category', lead: { color: category.color } }));

    const articleOptions: UnnumberedOption[] = (searched?.articles ?? []).map((article) => ({
        href: article.href,
        title: article.title,
        detail: article.source,
        aside: article.time,
        lead: { initial: article.source.charAt(0) },
    }));

    const matchedSources = searched
        ? searched.sources
        : sources.filter((source) => needle && source.name.toLowerCase().includes(needle) && (!scopeHref || source.categoryHref === scopeHref));

    // The current category's sources come first; the sort is stable, so the rest keep their order.
    const sourceOptions: UnnumberedOption[] = [...matchedSources]
        .sort((a, b) => Number(b.categoryHref === currentCategoryHref) - Number(a.categoryHref === currentCategoryHref))
        .map((source) => ({ href: source.href, title: source.name, detail: source.detail, lead: { initial: source.name.charAt(0) } }));

    const unnumbered = [
        { label: 'Go to', options: [...viewOptions, ...categoryOptions] },
        { label: 'Articles', options: articleOptions },
        { label: 'Sources', options: sourceOptions },
    ];

    let nextIndex = 0;
    const groups: ResultGroup[] = [];

    for (const group of unnumbered) {
        if (group.options.length === 0)
            continue;

        const options = group.options.map((option) => ({ ...option, index: nextIndex++ }));

        groups.push({ label: group.label, options });
    }

    return groups;
}
