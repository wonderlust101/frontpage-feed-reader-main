import { describe, expect, test } from 'bun:test';
import { parseFeedDate } from '../../../src/lib/feed';

const NOW = Date.parse('2026-01-01T00:00:00Z');
const EXPECTED = '2024-10-02T15:00:00.000Z';

describe('parseFeedDate', () => {
    describe('ISO 8601 / RFC 3339 (Atom)', () => {
        test.each([
            ['UTC', '2024-10-02T15:00:00Z'],
            ['lowercase z', '2024-10-02t15:00:00z'],
            ['an offset', '2024-10-02T17:00:00+02:00'],
            ['a compact offset', '2024-10-02T17:00:00+0200'],
            ['an hours-only offset', '2024-10-02T20:00:00+05'],
            ['no seconds', '2024-10-02T15:00Z'],
            ['no zone (read as UTC)', '2024-10-02T15:00:00'],
            ['a space instead of T', '2024-10-02 15:00:00'],
        ])('parses %s', (_label, input) => {
            expect(parseFeedDate(input, NOW)).toBe(EXPECTED);
        });

        test('keeps milliseconds and ignores extra fractional digits', () => {
            expect(parseFeedDate('2024-10-02T15:00:00.123456789Z', NOW)).toBe('2024-10-02T15:00:00.123Z');
        });

        test('reads a date-only value as midnight UTC', () => {
            expect(parseFeedDate('2024-10-02', NOW)).toBe('2024-10-02T00:00:00.000Z');
        });
    });

    describe('RFC 822 / 2822 (RSS)', () => {
        test.each([
            ['a numeric zone', 'Wed, 02 Oct 2024 15:00:00 +0000'],
            ['GMT', 'Wed, 02 Oct 2024 15:00:00 GMT'],
            ['UT', 'Wed, 02 Oct 2024 15:00:00 UT'],
            ['a US zone name (PDT)', 'Wed, 02 Oct 2024 08:00:00 PDT'],
            ['a US zone name (EST)', 'Wed, 02 Oct 2024 10:00:00 EST'],
            ['a single-digit day', 'Wed, 2 Oct 2024 15:00:00 +0000'],
            ['no seconds', 'Wed, 02 Oct 2024 15:00 GMT'],
            ['no day name', '02 Oct 2024 15:00:00 +0000'],
            ['a long day name', 'Wednesday, 02 Oct 2024 15:00:00 GMT'],
            ['a two-digit year', 'Wed, 02 Oct 24 15:00:00 GMT'],
            ['a full month name', 'Wed, 2 October 2024 15:00:00 +0000'],
            ['lowercase names', 'wed, 02 oct 2024 15:00:00 gmt'],
            ['no zone (read as UTC)', 'Wed, 02 Oct 2024 15:00:00'],
            ['extra whitespace', '\n   Wed,  02 Oct 2024   15:00:00 GMT \n'],
        ])('parses %s', (_label, input) => {
            expect(parseFeedDate(input, NOW)).toBe(EXPECTED);
        });

        test('parses a half-hour offset', () => {
            expect(parseFeedDate('Wed, 02 Oct 2024 20:30:00 +0530', NOW)).toBe(EXPECTED);
        });

        test.each([
            ['CET (Central Europe)', 'Wed, 02 Oct 2024 16:00:00 CET'],
            ['CEST (Central Europe, summer)', 'Wed, 02 Oct 2024 17:00:00 CEST'],
            ['JST (Japan)', 'Thu, 03 Oct 2024 00:00:00 JST'],
            ['AEST (Australia East)', 'Thu, 03 Oct 2024 01:00:00 AEST'],
            ['ACST (Australia Central, +9:30)', 'Thu, 03 Oct 2024 00:30:00 ACST'],
            ['NPT (Nepal, +5:45)', 'Wed, 02 Oct 2024 20:45:00 NPT'],
            ['NST (Newfoundland, -3:30)', 'Wed, 02 Oct 2024 11:30:00 NST'],
            ['HST (Hawaii)', 'Wed, 02 Oct 2024 05:00:00 HST'],
            ['GMT+offset', 'Wed, 02 Oct 2024 20:30:00 GMT+0530'],
            ['UTC with an hours-only offset', 'Wed, 02 Oct 2024 07:00:00 UTC-8'],
            ['an hours-only offset', 'Wed, 02 Oct 2024 20:00:00 +05'],
            ['a far offset (Chatham, +13:45)', 'Thu, 03 Oct 2024 04:45:00 +1345'],
        ])('parses %s', (_label, input) => {
            expect(parseFeedDate(input, NOW)).toBe(EXPECTED);
        });

        test('accepts "Sept"', () => {
            expect(parseFeedDate('Mon, 02 Sept 2024 15:00:00 GMT', NOW)).toBe('2024-09-02T15:00:00.000Z');
        });
    });

    describe('returns null rather than guessing', () => {
        test.each([
            ['empty', ''],
            ['null', null],
            ['undefined', undefined],
            ['garbage', 'sometime last week'],
            ['Feb 31 (RFC 822)', 'Sat, 31 Feb 2024 10:00:00 GMT'],
            ['Feb 30 (ISO)', '2024-02-30T10:00:00Z'],
            ['Feb 29 in a non-leap year', '2023-02-29'],
            ['hour 25', '2024-10-02T25:00:00Z'],
            ['minute 60', 'Wed, 02 Oct 2024 15:60:00 GMT'],
            ['a word that merely starts like a month', 'Wed, 02 Octopus 2024 15:00:00 GMT'],
            ['an unknown zone', 'Wed, 02 Oct 2024 15:00:00 XYZT'],
            ['an ambiguous zone (IST: India, Ireland or Israel)', 'Wed, 02 Oct 2024 15:00:00 IST'],
            ['an ambiguous zone (BST: Britain or Bangladesh)', 'Wed, 02 Oct 2024 15:00:00 BST'],
            ['an ambiguous zone (AST: Atlantic or Arabia)', 'Wed, 02 Oct 2024 15:00:00 AST'],
            ['an impossible offset (+25:00)', 'Wed, 02 Oct 2024 15:00:00 +2500'],
            ['an impossible offset (+05:75)', 'Wed, 02 Oct 2024 15:00:00 +0575'],
            ['month-first dates', 'October 2, 2024 3:00 PM GMT'],
            ['slash dates (dd/mm or mm/dd?)', '02/10/2024'],
            ['epoch numbers', '1727881200'],
            ['before 1995', 'Mon, 01 Jan 1990 00:00:00 GMT'],
            ['far in the future', 'Fri, 01 Jan 2100 00:00:00 GMT'],
        ])('%s', (_label, input) => {
            expect(parseFeedDate(input, NOW)).toBeNull();
        });
    });

    test('accepts Feb 29 in a leap year', () => {
        expect(parseFeedDate('2024-02-29', NOW)).toBe('2024-02-29T00:00:00.000Z');
    });

    test('allows small clock skew into the future', () => {
        expect(parseFeedDate('2026-01-01T06:00:00Z', NOW)).toBe('2026-01-01T06:00:00.000Z');
    });
});
