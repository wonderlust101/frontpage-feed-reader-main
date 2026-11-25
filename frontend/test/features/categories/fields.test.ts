import { describe, expect, test } from 'bun:test';
import { assignFields, fieldOrNone, NO_FIELD } from '../../../src/features/categories/fields';

describe('fieldOrNone', () => {
    test('returns the field for a known id', () => {
        expect(fieldOrNone('sky').id).toBe('sky');
    });

    test('falls back to "No color" for a missing or unknown id', () => {
        expect(fieldOrNone(undefined)).toBe(NO_FIELD);
        expect(fieldOrNone('plaid')).toBe(NO_FIELD);
    });
});

describe('assignFields', () => {
    test(`takes the reader's choice, else the preset, else "No color"`, () => {
        const fields = assignFields(['a', 'b', 'c'], { a: 'rose' }, { a: 'sky', b: 'leaf' });

        expect([fields.a.id, fields.b.id, fields.c.id]).toEqual(['rose', 'leaf', 'none']);
    });
});
