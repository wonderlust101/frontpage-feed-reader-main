import { describe, expect, test } from 'bun:test';
import { isUuid } from '../../src/lib/uuid';

const ID = '0b6f7e7c-3a4d-4f1e-9b8a-2c5d6e7f8a9b';

describe('isUuid', () => {
    test('accepts a UUID in lower or upper case', () => {
        expect(isUuid(ID)).toBe(true);
        expect(isUuid(ID.toUpperCase())).toBe(true);
    });

    test.each([
        ['an empty string', ''],
        ['one character short', ID.slice(1)],
        ['one character long', `${ID}a`],
        ['a missing hyphen', ID.replace('-', '0')],
        ['braces around it', `{${ID}}`],
        ['a non-hex character', ID.replace('b', 'g')],
        ['surrounding spaces', ` ${ID} `],
    ])('rejects %s', (_case, value) => {
        expect(isUuid(value)).toBe(false);
    });

    test('rejects values that are not strings', () => {
        expect(isUuid(42)).toBe(false);
        expect(isUuid(null)).toBe(false);
        expect(isUuid(undefined)).toBe(false);
        expect(isUuid([ID])).toBe(false);
    });
});
