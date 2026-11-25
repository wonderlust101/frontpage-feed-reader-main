// Every 400 is found before any 404, so a request with both kinds of problem always gets the 400. An id that isn't
// a UUID is "not found" (404), the same answer as for something the reader can't see.

import {
    ITEM_PAGE_SIZE,
    MAX_ITEM_PAGE_SIZE,
    MAX_READ_BATCH,
    MAX_UNDO_ENTRIES,
    UNCATEGORIZED,
    type ItemOrder,
    type MarkItemsReadRequest,
    type ReadUndo,
} from '@frontpage/shared';
import { requireJsonObject } from '../../lib/request-body';
import { isUuid, requireUuid } from '../../lib/uuid';
import { BadRequestError } from '../../errors';
import { decodeCursor } from './items.cursor';
import type { ItemCursor, ItemListQuery, ItemScope, MarkAllReadCommand } from './items.types';

type ListParameter = (typeof LIST_PARAMETERS)[number];

const LIST_PARAMETERS = ['feed', 'category', 'unread', 'order', 'limit', 'cursor'] as const;
const WHOLE_NUMBER = /^\d+$/;
// UTC with up to microseconds, the form the API sends (e.g. "2026-03-01T10:00:00.123456Z"). Other forms that Date.parse
// accepts, like "1", would reach Postgres and fail there.
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;

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

export function parseItemId(value: string): string {
    return requireUuid(value, 'not_found', 'Item not found');
}

// Ids are lowercased and de-duplicated, so each item is written once and matches the ids Postgres returns.
export function parseMarkItemsRead(body: unknown): MarkItemsReadRequest {
    const { itemIds, isRead } = requireJsonObject(body);

    if (!Array.isArray(itemIds) || itemIds.length === 0 || itemIds.length > MAX_READ_BATCH)
        throw new BadRequestError('bad_request', `itemIds must be a list of 1 to ${MAX_READ_BATCH} item ids`);

    if (!itemIds.every(isUuid))
        throw new BadRequestError('bad_request', 'itemIds must only hold item ids');

    if (typeof isRead !== 'boolean')
        throw new BadRequestError('bad_request', 'isRead must be true or false');

    return { itemIds: [...new Set(itemIds.map((id) => id.toLowerCase()))], isRead };
}

// Same scopes as the list. `asOf` may be in the future here; the service caps it at the current time.
export function parseMarkAllRead(body: unknown): MarkAllReadCommand {
    const fields = requireJsonObject(body);
    const feed = optionalString(fields, 'feed');
    const category = optionalString(fields, 'category');
    const asOf = optionalString(fields, 'asOf');

    if (feed !== undefined && category !== undefined)
        throw new BadRequestError('bad_request', 'Mark a feed or a category as read, not both');

    if (asOf !== undefined && !isUtcTimestamp(asOf))
        throw new BadRequestError('bad_request', 'asOf must be a UTC time like 2026-03-01T10:00:00.000Z');

    // Last, so that every 400 above wins over its 404s.
    const scope = parseScope(feed, category);

    return { scope, asOf: asOf === undefined ? null : new Date(asOf) };
}

export function parseReadUndo(body: unknown): ReadUndo {
    const fields = requireJsonObject(body);

    if (typeof fields.asOf !== 'string' || !isUtcTimestamp(fields.asOf))
        throw new BadRequestError('bad_request', 'asOf must be the UTC time the mark-all answered with');

    const asOf = fields.asOf;
    const cutoffs = undoEntries(fields.cutoffs, 'cutoffs').map(parseUndoCutoff);
    const marks = undoEntries(fields.marks, 'marks').map(parseUndoMark);

    if (hasDuplicates(cutoffs.map((cutoff) => cutoff.feedId)) || hasDuplicates(marks.map((mark) => mark.itemId)))
        throw new BadRequestError('bad_request', 'A feed or an item is listed twice');

    return { asOf, cutoffs, marks };
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
    if (feed !== undefined)
        return { kind: 'feed', feedId: requireUuid(feed, 'feed_not_found', 'Feed not found') };

    if (category === undefined)
        return { kind: 'all' };

    if (category === UNCATEGORIZED)
        return { kind: 'category', categoryId: null };

    return { kind: 'category', categoryId: requireUuid(category, 'category_not_found', 'Category not found') };
}

// A string field that may be left out; throws `bad_request` when it's there but isn't a string.
function optionalString(fields: Record<string, unknown>, name: string): string | undefined {
    const value = fields[name];

    if (value !== undefined && typeof value !== 'string')
        throw new BadRequestError('bad_request', `${name} must be a string`);

    return value;
}

// Also refuses dates that don't exist, like Feb 30, which Date would quietly roll over into March.
function isUtcTimestamp(value: string): boolean {
    return UTC_TIMESTAMP.test(value) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
}

function undoEntries(value: unknown, name: string): unknown[] {
    if (!Array.isArray(value) || value.length > MAX_UNDO_ENTRIES)
        throw new BadRequestError('bad_request', `${name} must be a list of at most ${MAX_UNDO_ENTRIES} entries`);

    return value;
}

function parseUndoCutoff(entry: unknown): ReadUndo['cutoffs'][number] {
    const { feedId, readCutoff } = (entry ?? {}) as Record<string, unknown>;
    const isValidCutoff = readCutoff === null || (typeof readCutoff === 'string' && isUtcTimestamp(readCutoff));

    if (!isUuid(feedId) || !isValidCutoff)
        throw new BadRequestError('bad_request', 'Each cutoff needs a feedId and a readCutoff (a UTC time or null)');

    return { feedId: feedId.toLowerCase(), readCutoff };
}

function parseUndoMark(entry: unknown): ReadUndo['marks'][number] {
    const { itemId, isRead } = (entry ?? {}) as Record<string, unknown>;

    if (!isUuid(itemId) || typeof isRead !== 'boolean')
        throw new BadRequestError('bad_request', 'Each mark needs an itemId and isRead (true or false)');

    return { itemId: itemId.toLowerCase(), isRead };
}

function hasDuplicates(ids: string[]): boolean {
    return new Set(ids).size !== ids.length;
}
