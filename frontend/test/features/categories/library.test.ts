import { describe, expect, test } from 'bun:test';
import {
    addCategory,
    deleteCategory,
    isNameTaken,
    moveCategory,
    placeFeed,
    unsubscribe,
    updateCategory,
    type Library,
} from '../../../src/features/categories/library';

const LIBRARY: Library = {
    categories: [
        { id: 'frontend', name: 'Frontend', fieldId: 'coral', feeds: ['CSS-Tricks', 'web.dev'] },
        { id: 'design', name: 'Design', fieldId: 'sky', feeds: ['Sidebar.io'] },
    ],
    uncategorized: ['Hacker News Best'],
};

describe('isNameTaken', () => {
    test('matches another category ignoring case and spaces', () => {
        expect(isNameTaken(LIBRARY, '  design ')).toBe(true);
    });

    test('ignores the category being renamed', () => {
        expect(isNameTaken(LIBRARY, 'DESIGN', 'design')).toBe(false);
    });

    test('is false for a new name', () => {
        expect(isNameTaken(LIBRARY, 'Football')).toBe(false);
    });
});

describe('updateCategory', () => {
    test('changes only the named category', () => {
        const updated = updateCategory(LIBRARY, 'design', { name: 'UX', fieldId: 'rose' });
        expect(updated.categories[1]).toEqual({ id: 'design', name: 'UX', fieldId: 'rose', feeds: ['Sidebar.io'] });
        expect(updated.categories[0]).toBe(LIBRARY.categories[0]);
    });
});

describe('addCategory', () => {
    test('adds an empty, trimmed category on No color at the end', () => {
        expect(addCategory(LIBRARY, 'film', ' Film ').categories.at(-1)).toEqual({ id: 'film', name: 'Film', fieldId: 'none', feeds: [] });
    });
});

describe('deleteCategory', () => {
    test('moves its feeds to Uncategorized', () => {
        expect(deleteCategory(LIBRARY, 'frontend')).toEqual({
            categories: [LIBRARY.categories[1]],
            uncategorized: ['Hacker News Best', 'CSS-Tricks', 'web.dev'],
        });
    });

    test('leaves the library alone for an unknown id', () => {
        expect(deleteCategory(LIBRARY, 'nope')).toEqual(LIBRARY);
    });
});

describe('moveCategory', () => {
    test('swaps with its neighbour', () => {
        expect(moveCategory(LIBRARY, 'design', -1).categories.map((category) => category.id)).toEqual(['design', 'frontend']);
    });

    test('stays put at either end', () => {
        expect(moveCategory(LIBRARY, 'frontend', -1)).toBe(LIBRARY);
        expect(moveCategory(LIBRARY, 'design', 1)).toBe(LIBRARY);
    });
});

describe('placeFeed', () => {
    test('moves a feed between categories', () => {
        const moved = placeFeed(LIBRARY, 'web.dev', 'design');
        expect(moved.categories[0].feeds).toEqual(['CSS-Tricks']);
        expect(moved.categories[1].feeds).toEqual(['Sidebar.io', 'web.dev']);
    });

    test('moves a feed to Uncategorized', () => {
        const moved = placeFeed(LIBRARY, 'Sidebar.io', null);
        expect(moved.categories[1].feeds).toEqual([]);
        expect(moved.uncategorized).toEqual(['Hacker News Best', 'Sidebar.io']);
    });

    test('adds a new feed', () => {
        expect(placeFeed(LIBRARY, 'Figma Blog', 'design').categories[1].feeds).toEqual(['Sidebar.io', 'Figma Blog']);
    });
});

describe('unsubscribe', () => {
    test('removes the feed wherever it is', () => {
        expect(unsubscribe(LIBRARY, 'Hacker News Best').uncategorized).toEqual([]);
        expect(unsubscribe(LIBRARY, 'CSS-Tricks').categories[0].feeds).toEqual(['web.dev']);
    });
});
