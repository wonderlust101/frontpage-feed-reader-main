import { describe, expect, test } from 'bun:test';
import { parseFeedDate } from '../../../src/lib/feed';

const NOW = Date.parse('2026-01-01T00:00:00Z');
const EXPECTED = '2024-10-02T15:00:00.000Z';

describe('parseFeedDate', () => {
    test.each([
        ['RFC 822 with numeric zone', 'Wed, 02 Oct 2024 15:00:00 +0000'],
        ['RFC 822 with GMT', 'Wed, 02 Oct 2024 15:00:00 GMT'],
        ['RFC 822 with a US zone name', 'Wed, 02 Oct 2024 08:00:00 PDT'],
        ['RFC 822 with EST', 'Wed, 02 Oct 2024 10:00:00 EST'],
        ['RFC 822 with GMT+offset', 'Wed, 02 Oct 2024 16:00:00 GMT+0100'],
        ['RFC 822 without seconds', 'Wed, 02 Oct 2024 15:00 GMT'],
        ['RFC 822 without a day name', '2 Oct 2024 15:00:00 +0000'],
        ['a wrong / long day name', 'Monday, 02 Oct 2024 15:00:00 GMT'],
        ['a two-digit year', 'Wed, 02 Oct 24 15:00:00 GMT'],
        ['a full month name', 'Wednesday, 2 October 2024 15:00:00 +0000'],
        ['ISO 8601 UTC', '2024-10-02T15:00:00Z'],
        ['ISO 8601 with fraction', '2024-10-02T15:00:00.000Z'],
        ['ISO 8601 with an offset', '2024-10-02T17:00:00+02:00'],
        ['ISO 8601 with a compact offset', '2024-10-02T17:00:00+0200'],
        ['ISO-ish without a zone (read as UTC)', '2024-10-02 15:00:00'],
        ['ISO-ish with slashes', '2024/10/02 15:00:00'],
        ['month first with am/pm', 'October 2, 2024 3:00 PM GMT'],
        ['month first, abbreviated', 'Oct 2, 2024 15:00:00 +0000'],
        ['epoch seconds', String(Date.parse(EXPECTED) / 1000)],
        ['epoch milliseconds', String(Date.parse(EXPECTED))],
        ['surrounding whitespace', '\n   Wed, 02 Oct 2024 15:00:00 GMT \n'],
    ])('parses %s', (_label, input) => {
        expect(parseFeedDate(input, NOW)).toBe(EXPECTED);
    });

    test('parses a date-only value as midnight UTC', () => {
        expect(parseFeedDate('2024-10-02', NOW)).toBe('2024-10-02T00:00:00.000Z');
    });

    test.each([
        ['empty', ''],
        ['null', null],
        ['undefined', undefined],
        ['garbage', 'sometime last week'],
        ['an impossible month', 'Wed, 02 Foo 2024 15:00:00 GMT'],
        ['an unknown zone', 'Wed, 02 Oct 2024 15:00:00 XYZT'],
        ['before 1995', 'Mon, 01 Jan 1990 00:00:00 GMT'],
        ['far in the future', 'Fri, 01 Jan 2100 00:00:00 GMT'],
    ])('returns null for %s', (_label, input) => {
        expect(parseFeedDate(input, NOW)).toBeNull();
    });

    test('allows small clock skew into the future', () => {
        expect(parseFeedDate('2026-01-01T06:00:00Z', NOW)).toBe('2026-01-01T06:00:00.000Z');
    });
});
