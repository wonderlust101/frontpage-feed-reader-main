import { describe, expect, test } from 'bun:test';
import { decodeCursor, encodeCursor } from '../../../src/modules/items/items.cursor';
import type { ItemCursor } from '../../../src/modules/items/items.types';
import { SAMPLE_UUID } from '../../helpers/factories';

const CURSOR: ItemCursor = { order: 'newest', sortAt: '2026-03-01T10:00:00.123456Z', id: SAMPLE_UUID };

// The cursor a client would get for this raw "order|sortAt|id" text.
function encoded(text: string): string {
    return Buffer.from(text).toString('base64url');
}

describe('encodeCursor', () => {
    test('round-trips through decodeCursor, keeping all six microsecond digits', () => {
        expect(decodeCursor(encodeCursor(CURSOR))).toEqual(CURSOR);
        expect(decodeCursor(encodeCursor({ ...CURSOR, order: 'oldest' }))).toEqual({ ...CURSOR, order: 'oldest' });
    });

    test('is URL-safe: no +, / or = that would need escaping in a query string', () => {
        expect(encodeCursor(CURSOR)).toMatch(/^[A-Za-z0-9_-]+$/);
    });
});

describe('decodeCursor', () => {
    test.each([
        ['junk that is not base64', '%%%not-a-cursor%%%'],
        ['an empty string', ''],
        ['an unknown order', encoded(`newer|2026-03-01T10:00:00.123456Z|${SAMPLE_UUID}`)],
        ['two parts', encoded('newest|2026-03-01T10:00:00.123456Z')],
        ['four parts', encoded(`newest|2026-03-01T10:00:00.123456Z|${SAMPLE_UUID}|extra`)],
        ['a time with only milliseconds', encoded(`newest|2026-03-01T10:00:00.123Z|${SAMPLE_UUID}`)],
        ['a time without the trailing Z', encoded(`newest|2026-03-01T10:00:00.123456|${SAMPLE_UUID}`)],
        ['February 30th', encoded(`newest|2026-02-30T10:00:00.123456Z|${SAMPLE_UUID}`)],
        ['hour 24', encoded(`newest|2026-03-01T24:00:00.000000Z|${SAMPLE_UUID}`)],
        ['month 13', encoded(`newest|2026-13-01T10:00:00.000000Z|${SAMPLE_UUID}`)],
        ['year 0000 (Postgres has no year zero)', encoded(`newest|0000-03-01T10:00:00.123456Z|${SAMPLE_UUID}`)],
        ['an id that is not a UUID', encoded('newest|2026-03-01T10:00:00.123456Z|not-a-uuid')],
    ])('returns null for %s', (_case, value) => {
        expect(decodeCursor(value)).toBeNull();
    });

    test('returns null for anything over 200 characters, before decoding it', () => {
        expect(decodeCursor(encodeCursor(CURSOR) + 'A'.repeat(200))).toBeNull();
    });

    test('accepts February 29th in a leap year', () => {
        expect(decodeCursor(encoded(`oldest|2028-02-29T23:59:59.999999Z|${SAMPLE_UUID}`))).toEqual({ order: 'oldest', sortAt: '2028-02-29T23:59:59.999999Z', id: SAMPLE_UUID });
    });
});
