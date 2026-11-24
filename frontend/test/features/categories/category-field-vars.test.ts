import { describe, expect, test } from 'bun:test';
import { CATEGORY_FIELDS_KEY, CATEGORY_FIELDS_SCRIPT, categoryColor } from '../../../src/features/categories/category-field-vars';

// Runs the early script against a fake page whose storage holds `saved`, returning the properties it set.
function runScript(saved: string | null) {
    const set: Record<string, string> = {};
    const fakeDocument = { documentElement: { style: { setProperty: (name: string, value: string) => (set[name] = value) } } };
    const fakeStorage = { getItem: (key: string) => (key === CATEGORY_FIELDS_KEY ? saved : null) };
    new Function('document', 'localStorage', CATEGORY_FIELDS_SCRIPT)(fakeDocument, fakeStorage);
    return set;
}

describe('categoryColor', () => {
    test('falls back to the preset until a choice is set', () => {
        expect(categoryColor('design', 'var(--color-field-sky)')).toBe('var(--category-design, var(--color-field-sky))');
    });
});

describe('CATEGORY_FIELDS_SCRIPT', () => {
    test('sets a property for each valid choice', () => {
        expect(runScript(JSON.stringify({ design: 'none', ai: 'rose' }))).toEqual({
            '--category-design': 'var(--color-field-none)',
            '--category-ai': 'var(--color-field-rose)',
        });
    });

    test('ignores unknown fields, unsafe ids and broken storage', () => {
        expect(runScript(JSON.stringify({ design: 'red', 'x;}': 'rose' }))).toEqual({});
        expect(runScript('not json')).toEqual({});
        expect(runScript(null)).toEqual({});
    });
});
