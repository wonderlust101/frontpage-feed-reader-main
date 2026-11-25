import { describe, expect, test } from 'bun:test';
import { isUuid } from '../../src/lib/uuid';
import { SAMPLE_UUID } from '../helpers/factories';

describe('isUuid', () => {
    test('accepts a UUID in lower or upper case', () => {
        expect(isUuid(SAMPLE_UUID)).toBe(true);
        expect(isUuid(SAMPLE_UUID.toUpperCase())).toBe(true);
    });

    test.each([
        ['an empty string', ''],
        ['one character short', SAMPLE_UUID.slice(1)],
        ['one character long', `${SAMPLE_UUID}a`],
        ['a missing hyphen', SAMPLE_UUID.replace('-', '0')],
        ['braces around it', `{${SAMPLE_UUID}}`],
        ['a non-hex character', SAMPLE_UUID.replace('b', 'g')],
        ['surrounding spaces', ` ${SAMPLE_UUID} `],
    ])('rejects %s', (_case, value) => {
        expect(isUuid(value)).toBe(false);
    });

    test('rejects values that are not strings', () => {
        expect(isUuid(42)).toBe(false);
        expect(isUuid(null)).toBe(false);
        expect(isUuid(undefined)).toBe(false);
        expect(isUuid([SAMPLE_UUID])).toBe(false);
    });
});
