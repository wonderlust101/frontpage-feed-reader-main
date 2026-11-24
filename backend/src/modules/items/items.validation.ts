// Every 400 is found before any 404, so a request with both kinds of problem always gets the 400. An id that isn't
// a UUID is "not found" (404), the same answer as for something the reader can't see.

import { ITEM_PAGE_SIZE, MAX_ITEM_PAGE_SIZE, UNCATEGORIZED, type ItemOrder } from '@frontpage/shared';
import { isUuid } from '../../lib/uuid';
import { BadRequestError, NotFoundError } from '../../middleware/errors';
import { decodeCursor } from './items.cursor';
import type { ItemCursor, ItemListQuery, ItemScope } from './items.types';

type ListParameter = (typeof LIST_PARAMETERS)[number];

const LIST_PARAMETERS = ['feed', 'category', 'unread', 'order', 'limit', 'cursor'] as const;
const WHOLE_NUMBER = /^\d+$/;

// Example: { category: 'uncategorized', unread: 'true' } → Uncategorized, unread only, newest first, 30 per page.
export function parseItemListQuery(query: Record<string, unknown>): ItemListQuery {
    const params = singleValues(query);

    if (params.feed !== undefined && params.category !== undefined)
        throw new BadRequestError('bad_request', 'Filter by feed or by category, not both');

    const unreadOnly = parseUnread(params.unread);
    const order = parseOrder(params.order);
    const limit = parseLimit(params.limit);
    const cursor = parseCursor(params.cursor, order);
    // Last, so that every 400 above wins over its 404s.
    const scope = parseScope(params.feed, params.category);

    return { scope, unreadOnly, order, limit, cursor };
}

// The item id from the URL; throws `not_found` (404) when it isn't a UUID.
export function parseItemId(value: string): string {
    if (!isUuid(value))
        throw new NotFoundError('not_found', 'Item not found');

    return value;
}

// The list parameters as single strings (undefined when absent). A parameter sent twice arrives as an array: `bad_request`.
function singleValues(query: Record<string, unknown>): Partial<Record<ListParameter, string>> {
    const values: Partial<Record<ListParameter, string>> = {};

    for (const name of LIST_PARAMETERS) {
        const value = query[name];

        if (value === undefined)
            continue;

        if (typeof value !== 'string')
            throw new BadRequestError('bad_request', `${name} can only be given once`);

        values[name] = value;
    }

    return values;
}

// `unread=true` lists unread items only; absent or `false` lists all. Throws `bad_request` for anything else.
function parseUnread(value: string | undefined): boolean {
    if (value === undefined || value === 'false')
        return false;

    if (value === 'true')
        return true;

    throw new BadRequestError('bad_request', 'unread must be true or false');
}

// `newest` (the default) or `oldest`; throws `bad_request` for anything else.
function parseOrder(value: string | undefined): ItemOrder {
    if (value === undefined)
        return 'newest';

    if (value === 'newest' || value === 'oldest')
        return value;

    throw new BadRequestError('bad_request', 'order must be newest or oldest');
}

// The page size: 30 when absent, else a whole number from 1 to 100 ("1.5", "1e2", "-1" and "" are refused with `bad_request`).
function parseLimit(value: string | undefined): number {
    if (value === undefined)
        return ITEM_PAGE_SIZE;

    const limit = Number(value);

    if (!WHOLE_NUMBER.test(value) || limit < 1 || limit > MAX_ITEM_PAGE_SIZE)
        throw new BadRequestError('bad_request', `limit must be a whole number from 1 to ${MAX_ITEM_PAGE_SIZE}`);

    return limit;
}

// The decoded cursor, or null for the first page. Throws `bad_request` when it's malformed or was made for the other order.
function parseCursor(value: string | undefined, order: ItemOrder): ItemCursor | null {
    if (value === undefined)
        return null;

    const cursor = decodeCursor(value);

    if (!cursor || cursor.order !== order)
        throw new BadRequestError('bad_request', 'cursor is not valid for this list; load the first page again');

    return cursor;
}

// "uncategorized" means no category; throws `feed_not_found` / `category_not_found` (404) for a value that can't be an id.
function parseScope(feed: string | undefined, category: string | undefined): ItemScope {
    if (feed !== undefined) {
        if (!isUuid(feed))
            throw new NotFoundError('feed_not_found', 'Feed not found');

        return { kind: 'feed', feedId: feed };
    }

    if (category === undefined)
        return { kind: 'all' };

    if (category === UNCATEGORIZED)
        return { kind: 'category', categoryId: null };

    if (!isUuid(category))
        throw new NotFoundError('category_not_found', 'Category not found');

    return { kind: 'category', categoryId: category };
}
