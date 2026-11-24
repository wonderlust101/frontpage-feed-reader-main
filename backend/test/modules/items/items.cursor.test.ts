import { describe, expect, test } from 'bun:test';
import { decodeCursor, encodeCursor } from '../../../src/modules/items/items.cursor';
import type { ItemCursor } from '../../../src/modules/items/items.types';

const ID = '0b6f7e7c-3a4d-4f1e-9b8a-2c5d6e7f8a9b';
const CURSOR: ItemCursor = { order: 'newest', sortAt: '2026-03-01T10:00:00.123456Z', id: ID };

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
        ['an unknown order', encoded(`newer|2026-03-01T10:00:00.123456Z|${ID}`)],
        ['two parts', encoded('newest|2026-03-01T10:00:00.123456Z')],
        ['four parts', encoded(`newest|2026-03-01T10:00:00.123456Z|${ID}|extra`)],
        ['a time with only milliseconds', encoded(`newest|2026-03-01T10:00:00.123Z|${ID}`)],
        ['a time without the trailing Z', encoded(`newest|2026-03-01T10:00:00.123456|${ID}`)],
        ['February 30th', encoded(`newest|2026-02-30T10:00:00.123456Z|${ID}`)],
        ['hour 24', encoded(`newest|2026-03-01T24:00:00.000000Z|${ID}`)],
        ['month 13', encoded(`newest|2026-13-01T10:00:00.000000Z|${ID}`)],
        ['year 0000 (Postgres has no year zero)', encoded(`newest|0000-03-01T10:00:00.123456Z|${ID}`)],
        ['an id that is not a UUID', encoded('newest|2026-03-01T10:00:00.123456Z|not-a-uuid')],
    ])('returns null for %s', (_case, value) => {
        expect(decodeCursor(value)).toBeNull();
    });

    test('returns null for anything over 200 characters, before decoding it', () => {
        expect(decodeCursor(encodeCursor(CURSOR) + 'A'.repeat(200))).toBeNull();
    });

    test('accepts February 29th in a leap year', () => {
        expect(decodeCursor(encoded(`oldest|2028-02-29T23:59:59.999999Z|${ID}`))).toEqual({ order: 'oldest', sortAt: '2028-02-29T23:59:59.999999Z', id: ID });
    });
});
