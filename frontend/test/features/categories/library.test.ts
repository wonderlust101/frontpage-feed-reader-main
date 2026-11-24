import { describe, expect, test } from 'bun:test';
import { deleteCategory, isNameTaken, updateCategory, type Library } from '../../../src/features/categories/library';

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
