// Request validation for the items routes: the list's query parameters (defaults, scopes, every rejection and which
// rejection wins), the item id, and the read-state bodies.

import { describe, expect, test } from 'bun:test';
import { encodeCursor } from '../../../src/modules/items/items.cursor';
import {
    parseItemId,
    parseItemListQuery,
    parseMarkAllRead,
    parseMarkItemsRead,
    parseReadUndo,
} from '../../../src/modules/items/items.validation';
import { httpErrorThrownBy } from '../../helpers/errors';
import { SAMPLE_UUID } from '../../helpers/factories';

const OTHER_UUID = '1c7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c';
const UNDO_AS_OF = '2026-03-01T10:20:00.000Z';
const NEWEST_CURSOR = encodeCursor({ order: 'newest', sortAt: '2026-03-01T10:00:00.123456Z', id: SAMPLE_UUID });

describe('parseItemListQuery', () => {
    test('no parameters → everything, all items, newest first, 30 per page, first page', () => {
        expect(parseItemListQuery({})).toEqual({ scope: { kind: 'all' }, unreadOnly: false, order: 'newest', limit: 30, cursor: null });
    });

    test('feed=<id> → that feed', () => {
        expect(parseItemListQuery({ feed: SAMPLE_UUID }).scope).toEqual({ kind: 'feed', feedId: SAMPLE_UUID });
    });

    test('category=<id> → that category; category=uncategorized → feeds without one', () => {
        expect(parseItemListQuery({ category: SAMPLE_UUID }).scope).toEqual({ kind: 'category', categoryId: SAMPLE_UUID });
        expect(parseItemListQuery({ category: 'uncategorized' }).scope).toEqual({ kind: 'category', categoryId: null });
    });

    test('reads unread, order, limit and cursor', () => {
        expect(parseItemListQuery({ unread: 'true', order: 'newest', limit: '100', cursor: NEWEST_CURSOR })).toEqual({
            scope: { kind: 'all' },
            unreadOnly: true,
            order: 'newest',
            limit: 100,
            cursor: { order: 'newest', sortAt: '2026-03-01T10:00:00.123456Z', id: SAMPLE_UUID },
        });
        expect(parseItemListQuery({ unread: 'false', order: 'oldest', limit: '1' })).toMatchObject({ unreadOnly: false, order: 'oldest', limit: 1 });
    });

    test('a limit with leading zeros is still a whole number', () => {
        expect(parseItemListQuery({ limit: '030' }).limit).toBe(30);
    });

    test('ignores unknown parameters, including bracketed ones like feed[]', () => {
        expect(parseItemListQuery({ userId: 'someone-else', 'feed[]': SAMPLE_UUID, page: '2' })).toEqual(parseItemListQuery({}));
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
        expect(httpErrorThrownBy(() => parseItemListQuery(query))).toMatchObject({ status: 400, code: 'bad_request' });
    });

    test('a cursor made for the other order → 400 bad_request', () => {
        expect(httpErrorThrownBy(() => parseItemListQuery({ order: 'oldest', cursor: NEWEST_CURSOR }))).toMatchObject({ status: 400, code: 'bad_request' });
    });

    test.each(['feed', 'category', 'unread', 'order', 'limit', 'cursor'])('%s sent twice → 400 bad_request', (name) => {
        const err = httpErrorThrownBy(() => parseItemListQuery({ [name]: ['a', 'b'] }));

        expect(err).toMatchObject({ status: 400, code: 'bad_request' });
        expect(err.message).toBe(`${name} can only be given once`);
    });

    test('feed and category together → 400 bad_request', () => {
        expect(httpErrorThrownBy(() => parseItemListQuery({ feed: SAMPLE_UUID, category: SAMPLE_UUID }))).toMatchObject({ status: 400, code: 'bad_request' });
    });

    test.each(['not-a-uuid', '', `${SAMPLE_UUID}x`])('feed=%p → 404 feed_not_found, like a feed the reader does not follow', (feed) => {
        expect(httpErrorThrownBy(() => parseItemListQuery({ feed }))).toMatchObject({ status: 404, code: 'feed_not_found', message: 'Feed not found' });
    });

    test.each(['not-a-uuid', '', 'Uncategorized', 'UNCATEGORIZED'])(
        'category=%p → 404 category_not_found (only the exact word means Uncategorized)',
        (category) => {
            expect(httpErrorThrownBy(() => parseItemListQuery({ category }))).toMatchObject({ status: 404, code: 'category_not_found', message: 'Category not found' });
        },
    );

    test('a 400 wins over a 404 when a request has both problems', () => {
        expect(httpErrorThrownBy(() => parseItemListQuery({ feed: 'nope', limit: '0' }))).toMatchObject({ status: 400 });
        expect(httpErrorThrownBy(() => parseItemListQuery({ category: 'nope', cursor: 'garbage' }))).toMatchObject({ status: 400 });
    });
});

describe('parseItemId', () => {
    test('accepts a UUID in any case', () => {
        expect(parseItemId(SAMPLE_UUID)).toBe(SAMPLE_UUID);
        expect(parseItemId(SAMPLE_UUID.toUpperCase())).toBe(SAMPLE_UUID.toUpperCase());
    });

    test.each(['not-a-uuid', '', 'counts', `${SAMPLE_UUID}x`])('%p → 404 not_found', (value) => {
        expect(httpErrorThrownBy(() => parseItemId(value))).toMatchObject({ status: 404, code: 'not_found', message: 'Item not found' });
    });
});

describe('parseMarkItemsRead', () => {
    test('reads the ids and the state, lowercasing ids and keeping each once', () => {
        expect(parseMarkItemsRead({ itemIds: [SAMPLE_UUID, SAMPLE_UUID.toUpperCase(), OTHER_UUID], isRead: false })).toEqual({
            itemIds: [SAMPLE_UUID, OTHER_UUID],
            isRead: false,
        });
    });

    test('accepts exactly 100 ids', () => {
        const itemIds = Array.from({ length: 100 }, (_, n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`);

        expect(parseMarkItemsRead({ itemIds, isRead: true }).itemIds).toHaveLength(100);
    });

    test.each([
        ['no itemIds', { isRead: true }],
        ['itemIds that is not a list', { itemIds: SAMPLE_UUID, isRead: true }],
        ['an empty list', { itemIds: [], isRead: true }],
        ['101 ids', { itemIds: Array.from({ length: 101 }, () => SAMPLE_UUID), isRead: true }],
        ['an id that is not a UUID', { itemIds: [SAMPLE_UUID, 'nope'], isRead: true }],
        ['an id that is not a string', { itemIds: [42], isRead: true }],
        ['no isRead', { itemIds: [SAMPLE_UUID] }],
        ['isRead as a string', { itemIds: [SAMPLE_UUID], isRead: 'true' }],
        ['a body that is not an object', [SAMPLE_UUID]],
    ])('%s → 400 bad_request', (_case, body) => {
        expect(httpErrorThrownBy(() => parseMarkItemsRead(body))).toMatchObject({ status: 400, code: 'bad_request' });
    });
});

describe('parseMarkAllRead', () => {
    test('an empty body → everything, no asOf', () => {
        expect(parseMarkAllRead({})).toEqual({ scope: { kind: 'all' }, asOf: null });
    });

    test('feed, category and Uncategorized scopes', () => {
        expect(parseMarkAllRead({ feed: SAMPLE_UUID }).scope).toEqual({ kind: 'feed', feedId: SAMPLE_UUID });
        expect(parseMarkAllRead({ category: SAMPLE_UUID }).scope).toEqual({ kind: 'category', categoryId: SAMPLE_UUID });
        expect(parseMarkAllRead({ category: 'uncategorized' }).scope).toEqual({ kind: 'category', categoryId: null });
    });

    test('asOf in the form the API sends, with milliseconds or microseconds, or in the future', () => {
        expect(parseMarkAllRead({ asOf: '2026-03-01T10:00:00.123Z' }).asOf).toEqual(new Date('2026-03-01T10:00:00.123Z'));
        expect(parseMarkAllRead({ asOf: '2026-03-01T10:00:00.123456Z' }).asOf).toEqual(new Date('2026-03-01T10:00:00.123Z'));
        expect(parseMarkAllRead({ asOf: '2999-01-01T00:00:00Z' }).asOf).toEqual(new Date('2999-01-01T00:00:00Z'));
    });

    test.each([
        ['feed and category together', { feed: SAMPLE_UUID, category: 'uncategorized' }],
        ['a feed that is not a string', { feed: 1 }],
        ['a category that is null', { category: null }],
        ['asOf that is a number', { asOf: 1772359200000 }],
        ['asOf that Date.parse would read as a year', { asOf: '1' }],
        ['asOf without a time zone', { asOf: '2026-03-01T10:00:00' }],
        ['asOf with an offset', { asOf: '2026-03-01T10:00:00+02:00' }],
        ['asOf on a day that does not exist', { asOf: '2026-02-30T10:00:00Z' }],
        ['asOf at hour 24', { asOf: '2026-03-01T24:00:00Z' }],
        ['a body that is not an object', null],
    ])('%s → 400 bad_request', (_case, body) => {
        expect(httpErrorThrownBy(() => parseMarkAllRead(body))).toMatchObject({ status: 400, code: 'bad_request' });
    });

    test('ids that are not UUIDs → 404, like a feed or category the reader cannot see', () => {
        expect(httpErrorThrownBy(() => parseMarkAllRead({ feed: 'nope' }))).toMatchObject({ status: 404, code: 'feed_not_found' });
        expect(httpErrorThrownBy(() => parseMarkAllRead({ category: 'Uncategorized' }))).toMatchObject({ status: 404, code: 'category_not_found' });
    });

    test('a 400 wins over a 404 when a request has both problems', () => {
        expect(httpErrorThrownBy(() => parseMarkAllRead({ feed: 'nope', asOf: 'yesterday' }))).toMatchObject({ status: 400 });
    });
});

describe('parseReadUndo', () => {
    test('reads cutoffs (a time or null) and marks, lowercasing ids', () => {
        const undo = {
            asOf: '2026-03-01T10:20:00.000Z',
            cutoffs: [
                { feedId: SAMPLE_UUID.toUpperCase(), readCutoff: '2026-03-01T10:00:00.123456Z' },
                { feedId: OTHER_UUID, readCutoff: null },
            ],
            marks: [{ itemId: SAMPLE_UUID, isRead: false }],
        };

        expect(parseReadUndo(undo)).toEqual({
            asOf: '2026-03-01T10:20:00.000Z',
            cutoffs: [
                { feedId: SAMPLE_UUID, readCutoff: '2026-03-01T10:00:00.123456Z' },
                { feedId: OTHER_UUID, readCutoff: null },
            ],
            marks: [{ itemId: SAMPLE_UUID, isRead: false }],
        });
    });

    test('empty lists are a valid (empty) undo', () => {
        expect(parseReadUndo({ asOf: UNDO_AS_OF, cutoffs: [], marks: [] })).toEqual({ asOf: UNDO_AS_OF, cutoffs: [], marks: [] });
    });

    test.each([
        ['no asOf', { cutoffs: [], marks: [] }],
        ['an asOf that is not a UTC time', { asOf: '2026-03-01', cutoffs: [], marks: [] }],
        ['no cutoffs', { asOf: UNDO_AS_OF, marks: [] }],
        ['no marks', { asOf: UNDO_AS_OF, cutoffs: [] }],
        ['1001 marks', { asOf: UNDO_AS_OF, cutoffs: [], marks: Array.from({ length: 1001 }, () => ({ itemId: SAMPLE_UUID, isRead: true })) }],
        ['a cutoff without a feedId', { asOf: UNDO_AS_OF, cutoffs: [{ readCutoff: null }], marks: [] }],
        ['a cutoff without readCutoff', { asOf: UNDO_AS_OF, cutoffs: [{ feedId: SAMPLE_UUID }], marks: [] }],
        ['a cutoff that is not a time', { asOf: UNDO_AS_OF, cutoffs: [{ feedId: SAMPLE_UUID, readCutoff: 'yesterday' }], marks: [] }],
        ['a cutoff entry that is a string', { asOf: UNDO_AS_OF, cutoffs: [SAMPLE_UUID], marks: [] }],
        ['a cutoff entry that is null', { asOf: UNDO_AS_OF, cutoffs: [null], marks: [] }],
        ['a mark with a bad itemId', { asOf: UNDO_AS_OF, cutoffs: [], marks: [{ itemId: 'nope', isRead: true }] }],
        ['a mark without isRead', { asOf: UNDO_AS_OF, cutoffs: [], marks: [{ itemId: SAMPLE_UUID }] }],
        [
            'a feed listed twice (in any case)',
            {
                asOf: UNDO_AS_OF,
                cutoffs: [
                    { feedId: SAMPLE_UUID, readCutoff: null },
                    { feedId: SAMPLE_UUID.toUpperCase(), readCutoff: null },
                ],
                marks: [],
            },
        ],
        [
            'an item listed twice',
            {
                asOf: UNDO_AS_OF,
                cutoffs: [],
                marks: [
                    { itemId: SAMPLE_UUID, isRead: true },
                    { itemId: SAMPLE_UUID, isRead: false },
                ],
            },
        ],
    ])('%s → 400 bad_request', (_case, body) => {
        expect(httpErrorThrownBy(() => parseReadUndo(body))).toMatchObject({ status: 400, code: 'bad_request' });
    });
});
