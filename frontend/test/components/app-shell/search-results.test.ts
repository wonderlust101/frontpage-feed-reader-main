import { describe, expect, test } from 'bun:test';
import type { ShellCategory, ShellView } from '../../../src/components/app-shell/nav-entries';
import { buildResultGroups, type SearchResults, type SearchSource } from '../../../src/components/app-shell/search-results';

const VIEWS: ShellView[] = [
    { href: '/guest', label: 'All items', icon: 'all-items' },
    { href: '/guest/saved', label: 'Saved', icon: 'saved', preview: 'Keep articles for later.' },
];

const CATEGORIES: ShellCategory[] = [
    { href: '/guest/c/frontend', name: 'Frontend', color: 'var(--color-field-coral)' },
    { href: '/guest/c/design', name: 'Design', color: 'var(--color-field-sky)' },
];

const SOURCES: SearchSource[] = [
    { href: '/guest/c/frontend', name: 'CSS-Tricks', detail: 'Frontend', categoryHref: '/guest/c/frontend' },
    { href: '/guest/c/design', name: 'CSS Weekly', detail: 'Design', categoryHref: '/guest/c/design' },
    { href: '/guest/c/design', name: 'Sidebar.io', detail: 'Design', categoryHref: '/guest/c/design' },
];

function build(overrides: Partial<Parameters<typeof buildResultGroups>[0]> = {}) {
    return buildResultGroups({
        query: '',
        views: VIEWS,
        categories: CATEGORIES,
        sources: SOURCES,
        searched: null,
        scopeHref: null,
        currentCategoryHref: null,
        ...overrides,
    });
}

function titles(groups: ReturnType<typeof buildResultGroups>) {
    return groups.map((group) => [group.label, group.options.map((option) => option.title)]);
}

describe('buildResultGroups', () => {
    test('before a query, lists every view and category to jump to, and no sources', () => {
        expect(titles(build())).toEqual([['Go to', ['All items', 'Saved', 'Frontend', 'Design']]]);
    });

    test('numbers options across groups, so each has its position in the whole list', () => {
        const groups = build({ query: 'd' });
        const indices = groups.flatMap((group) => group.options.map((option) => option.index));

        expect(titles(groups)).toEqual([
            ['Go to', ['Saved', 'Frontend', 'Design']],
            ['Sources', ['Sidebar.io']],
        ]);
        expect(indices).toEqual([0, 1, 2, 3]);
    });

    test('matches ignoring case and surrounding spaces, and leaves out empty groups', () => {
        expect(titles(build({ query: '  CSS ' }))).toEqual([['Sources', ['CSS-Tricks', 'CSS Weekly']]]);
    });

    test('a scope keeps only that category\'s sources', () => {
        expect(titles(build({ query: 'css', scopeHref: '/guest/c/design' }))).toEqual([['Sources', ['CSS Weekly']]]);
    });

    test('puts the current category\'s sources first, keeping the order within each part', () => {
        expect(titles(build({ query: 'css', currentCategoryHref: '/guest/c/design' }))).toEqual([['Sources', ['CSS Weekly', 'CSS-Tricks']]]);
    });

    test('marks account-only views as locked', () => {
        const [goTo] = build({ query: 'saved' });

        expect(goTo.options[0]).toMatchObject({ title: 'Saved', detail: 'View · with an account', locked: true, lead: { icon: 'saved' } });
    });

    test('a search function\'s results replace the plain sources and add articles', () => {
        const searched: SearchResults = {
            articles: [{ href: '#a', title: 'Container queries', source: 'CSS-Tricks', time: '2h' }],
            sources: [SOURCES[2]],
        };

        const groups = build({ query: 'zzz', searched });

        expect(titles(groups)).toEqual([
            ['Articles', ['Container queries']],
            ['Sources', ['Sidebar.io']],
        ]);
        expect(groups[0].options[0]).toMatchObject({ detail: 'CSS-Tricks', aside: '2h', lead: { initial: 'C' } });
    });

    test('nothing matching gives no groups', () => {
        expect(build({ query: 'nothing like this' })).toEqual([]);
    });
});
