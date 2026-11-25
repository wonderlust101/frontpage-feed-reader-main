// Request validation for the items routes: the list's query parameters (defaults, scopes, every rejection and which
// rejection wins) and the item id.

import { describe, expect, test } from 'bun:test';
import { HttpError } from '../../../src/middleware/errors';
import { encodeCursor } from '../../../src/modules/items/items.cursor';
import { parseItemId, parseItemListQuery } from '../../../src/modules/items/items.validation';

const ID = '0b6f7e7c-3a4d-4f1e-9b8a-2c5d6e7f8a9b';
const NEWEST_CURSOR = encodeCursor({ order: 'newest', sortAt: '2026-03-01T10:00:00.123456Z', id: ID });

// Runs a call that must throw and returns its HttpError, so a test can check the status and code.
function rejection(call: () => unknown): HttpError {
    try {
        call();
    } catch (err) {
        if (err instanceof HttpError)
            return err;

        throw err;
    }

    throw new Error('expected the call to throw');
}

describe('parseItemListQuery', () => {
    test('no parameters → everything, all items, newest first, 30 per page, first page', () => {
        expect(parseItemListQuery({})).toEqual({ scope: { kind: 'all' }, unreadOnly: false, order: 'newest', limit: 30, cursor: null });
    });

    test('feed=<id> → that feed', () => {
        expect(parseItemListQuery({ feed: ID }).scope).toEqual({ kind: 'feed', feedId: ID });
    });

    test('category=<id> → that category; category=uncategorized → feeds without one', () => {
        expect(parseItemListQuery({ category: ID }).scope).toEqual({ kind: 'category', categoryId: ID });
        expect(parseItemListQuery({ category: 'uncategorized' }).scope).toEqual({ kind: 'category', categoryId: null });
    });

    test('reads unread, order, limit and cursor', () => {
        expect(parseItemListQuery({ unread: 'true', order: 'newest', limit: '100', cursor: NEWEST_CURSOR })).toEqual({
            scope: { kind: 'all' },
            unreadOnly: true,
            order: 'newest',
            limit: 100,
            cursor: { order: 'newest', sortAt: '2026-03-01T10:00:00.123456Z', id: ID },
        });
        expect(parseItemListQuery({ unread: 'false', order: 'oldest', limit: '1' })).toMatchObject({ unreadOnly: false, order: 'oldest', limit: 1 });
    });

    test('a limit with leading zeros is still a whole number', () => {
        expect(parseItemListQuery({ limit: '030' }).limit).toBe(30);
    });

    test('ignores unknown parameters, including bracketed ones like feed[]', () => {
        expect(parseItemListQuery({ userId: 'someone-else', 'feed[]': ID, page: '2' })).toEqual(parseItemListQuery({}));
    });

    test.each([
        ['unread', { unread: 'yes' }],
        ['unread', { unread: 'TRUE' }],
        ['unread', { unread: '' }],
        ['order', { order: 'random' }],
        ['order', { order: '' }],
        ['limit', { limit: '0' }],
        ['limit', { limit: '101' }],
        ['limit', { limit: '-1' }],
        ['limit', { limit: '1.5' }],
        ['limit', { limit: '1e2' }],
        ['limit', { limit: ' 5' }],
        ['limit', { limit: 'abc' }],
        ['limit', { limit: '' }],
        ['cursor', { cursor: 'garbage' }],
        ['cursor', { cursor: '' }],
    ])('a bad %s (%p) → 400 bad_request', (_name, query) => {
        expect(rejection(() => parseItemListQuery(query))).toMatchObject({ status: 400, code: 'bad_request' });
    });

    test('a cursor made for the other order → 400 bad_request', () => {
        expect(rejection(() => parseItemListQuery({ order: 'oldest', cursor: NEWEST_CURSOR }))).toMatchObject({ status: 400, code: 'bad_request' });
    });

    test.each(['feed', 'category', 'unread', 'order', 'limit', 'cursor'])('%s sent twice → 400 bad_request', (name) => {
        const err = rejection(() => parseItemListQuery({ [name]: ['a', 'b'] }));

        expect(err).toMatchObject({ status: 400, code: 'bad_request' });
        expect(err.message).toBe(`${name} can only be given once`);
    });

    test('feed and category together → 400 bad_request', () => {
        expect(rejection(() => parseItemListQuery({ feed: ID, category: ID }))).toMatchObject({ status: 400, code: 'bad_request' });
    });

    test.each(['not-a-uuid', '', `${ID}x`])('feed=%p → 404 feed_not_found, like a feed the reader does not follow', (feed) => {
        expect(rejection(() => parseItemListQuery({ feed }))).toMatchObject({ status: 404, code: 'feed_not_found', message: 'Feed not found' });
    });

    test.each(['not-a-uuid', '', 'Uncategorized', 'UNCATEGORIZED'])(
        'category=%p → 404 category_not_found (only the exact word means Uncategorized)',
        (category) => {
            expect(rejection(() => parseItemListQuery({ category }))).toMatchObject({ status: 404, code: 'category_not_found', message: 'Category not found' });
        },
    );

    test('a 400 wins over a 404 when a request has both problems', () => {
        expect(rejection(() => parseItemListQuery({ feed: 'nope', limit: '0' }))).toMatchObject({ status: 400 });
        expect(rejection(() => parseItemListQuery({ category: 'nope', cursor: 'garbage' }))).toMatchObject({ status: 400 });
    });
});

describe('parseItemId', () => {
    test('accepts a UUID in any case', () => {
        expect(parseItemId(ID)).toBe(ID);
        expect(parseItemId(ID.toUpperCase())).toBe(ID.toUpperCase());
    });

    test.each(['not-a-uuid', '', 'counts', `${ID}x`])('%p → 404 not_found', (value) => {
        expect(rejection(() => parseItemId(value))).toMatchObject({ status: 404, code: 'not_found', message: 'Item not found' });
    });
});
