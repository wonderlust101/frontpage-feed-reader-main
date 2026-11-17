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
