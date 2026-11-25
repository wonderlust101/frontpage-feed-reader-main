// The read-state writes against in-memory Postgres (PGlite): marks, "mark all as read" and its undo, the counts of the
// feeds they touch, and that a reader can never change another reader's state. PGlite has one connection, so "last write wins"
// is tested with requests one after another, not in parallel.

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { and, eq, sql } from 'drizzle-orm';
import { MAX_UNDO_ENTRIES } from '@frontpage/shared';
import { itemReadStates, items, subscriptions } from '../../../src/db/schema';
import { markAllRead, setItemsRead, undoMarkAllRead } from '../../../src/modules/items/items.read-state';
import { countItems, getItem, microsecondUtcText } from '../../../src/modules/items/items.service';
import type { ItemScope } from '../../../src/modules/items/items.types';
import { createTestDb } from '../../helpers/test-db';
import { httpErrorFrom } from '../../helpers/errors';
import { SAMPLE_UUID, newCategory, newFeed, newUser } from '../../helpers/factories';

const NOW = new Date('2026-03-10T12:00:00.000Z');
const BASE_MS = Date.parse('2026-03-01T10:00:00.000Z');
const MINUTE_MS = 60 * 1000;

let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
    testDb = await createTestDb();
});

afterAll(async () => {
    await testDb.close();
});

beforeEach(async () => {
    await testDb.db.execute(sql`truncate table feeds, users cascade`);
});

// The time `n` minutes after 2026-03-01 10:00 UTC as microsecond ISO text, e.g. minutes(5) → "2026-03-01T10:05:00.000000Z".
function minutes(n: number): string {
    return new Date(BASE_MS + n * MINUTE_MS).toISOString().replace('Z', '000Z');
}

// Subscribes `userId` to `feedId`, optionally in a category and with a read cutoff (microsecond ISO text).
async function follow(userId: string, feedId: string, overrides: { categoryId?: string; readCutoff?: string } = {}) {
    await testDb.db.insert(subscriptions).values({
        userId,
        feedId,
        categoryId: overrides.categoryId ?? null,
        readCutoff: overrides.readCutoff ? sql`${overrides.readCutoff}::timestamptz` : null,
    });
}

// Inserts an item in `feedId` first seen at `firstSeenAt` (microsecond ISO text) and returns its id.
async function newItem(feedId: string, firstSeenAt: string): Promise<string> {
    const id = crypto.randomUUID();

    await testDb.db.insert(items).values(itemRow(id, feedId, firstSeenAt));

    return id;
}

function itemRow(id: string, feedId: string, firstSeenAt: string) {
    return {
        id,
        feedId,
        guid: id,
        title: `Item ${id.slice(-4)}`,
        summary: 'A short excerpt.',
        contentHtml: '<p>The whole article.</p>',
        hasFullContent: true,
        firstSeenAt: sql`${firstSeenAt}::timestamptz`,
        contentHash: 'hash',
    };
}

async function mark(userId: string, itemId: string, isRead: boolean) {
    await testDb.db.insert(itemReadStates).values({ userId, itemId, isRead });
}

async function isRead(userId: string, itemId: string): Promise<boolean> {
    return (await getItem(testDb.db, userId, itemId, NOW)).isRead;
}

// The reader's stored marks, sorted by item id so tests can compare them.
async function marksOf(userId: string) {
    return testDb.db
        .select({ itemId: itemReadStates.itemId, isRead: itemReadStates.isRead })
        .from(itemReadStates)
        .where(eq(itemReadStates.userId, userId))
        .orderBy(itemReadStates.itemId);
}

async function cutoffOf(userId: string, feedId: string): Promise<string | null> {
    const [row] = await testDb.db
        .select({ readCutoff: sql<string | null>`${microsecondUtcText(subscriptions.readCutoff)}` })
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.feedId, feedId)));

    return row?.readCutoff ?? null;
}

function byFeedId<T extends { feedId: string }>(list: T[]): T[] {
    return [...list].sort((a, b) => a.feedId.localeCompare(b.feedId));
}

describe('setItemsRead', () => {
    test('marking an unread item read lowers its feed\'s unread count by one, and answers with that feed only', async () => {
        const reader = await newUser(testDb.db);
        const design = await newCategory(testDb.db, reader);
        const feed = await newFeed(testDb.db);

        await follow(reader, feed, { categoryId: design });

        const opened = await newItem(feed, minutes(0));

        await newItem(feed, minutes(1));

        const result = await setItemsRead(testDb.db, reader, { itemIds: [opened], isRead: true });

        expect(result).toEqual({ updated: [opened], counts: { feeds: [{ feedId: feed, categoryId: design, items: 2, unread: 1 }] } });
        expect((await countItems(testDb.db, reader)).total).toEqual({ items: 2, unread: 1 });
        expect(await isRead(reader, opened)).toBe(true);
    });

    test('a mark that agrees with the cutoff is deleted rather than stored', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed(testDb.db);

        await follow(reader, feed, { readCutoff: minutes(10) });

        const item = await newItem(feed, minutes(0));

        await setItemsRead(testDb.db, reader, { itemIds: [item], isRead: false });
        expect(await marksOf(reader)).toEqual([{ itemId: item, isRead: false }]);

        await setItemsRead(testDb.db, reader, { itemIds: [item], isRead: true });
        expect(await marksOf(reader)).toEqual([]);
        expect(await isRead(reader, item)).toBe(true);
    });

    test('last write wins: read, then unread, ends unread without an error', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed(testDb.db);

        await follow(reader, feed);

        const item = await newItem(feed, minutes(0));

        await setItemsRead(testDb.db, reader, { itemIds: [item], isRead: true });
        await setItemsRead(testDb.db, reader, { itemIds: [item], isRead: true });
        await setItemsRead(testDb.db, reader, { itemIds: [item], isRead: false });

        expect(await isRead(reader, item)).toBe(false);
        expect(await marksOf(reader)).toEqual([]);
    });

    test('skips ids outside the reader\'s feeds and keeps the request\'s order in `updated`', async () => {
        const reader = await newUser(testDb.db);
        const otherReader = await newUser(testDb.db);
        const feed = await newFeed(testDb.db);
        const othersFeed = await newFeed(testDb.db);

        await follow(reader, feed);
        await follow(otherReader, othersFeed);

        const first = await newItem(feed, minutes(0));
        const second = await newItem(feed, minutes(1));
        const othersItem = await newItem(othersFeed, minutes(0));

        await mark(otherReader, othersItem, true);

        const result = await setItemsRead(testDb.db, reader, { itemIds: [second, othersItem, SAMPLE_UUID, first], isRead: true });

        expect(result.updated).toEqual([second, first]);
        expect(await marksOf(reader)).toHaveLength(2);
        expect(await marksOf(otherReader)).toEqual([{ itemId: othersItem, isRead: true }]);
    });

    test('ids that are all skipped change nothing and answer with no counts', async () => {
        const reader = await newUser(testDb.db);

        const result = await setItemsRead(testDb.db, reader, { itemIds: [SAMPLE_UUID], isRead: true });

        expect(result).toEqual({ updated: [], counts: { feeds: [] } });
    });

    test('the counts hold only the touched feeds, and match the full counts for them', async () => {
        const reader = await newUser(testDb.db);
        const touchedFeed = await newFeed(testDb.db);
        const quietFeed = await newFeed(testDb.db);

        await follow(reader, touchedFeed);
        await follow(reader, quietFeed);

        const first = await newItem(touchedFeed, minutes(0));
        const second = await newItem(touchedFeed, minutes(1));

        await newItem(quietFeed, minutes(0));

        const result = await setItemsRead(testDb.db, reader, { itemIds: [first, second], isRead: true });
        const fullCounts = await countItems(testDb.db, reader);

        expect(result.counts.feeds).toEqual([{ feedId: touchedFeed, categoryId: null, items: 2, unread: 0 }]);
        expect(result.counts.feeds).toEqual(fullCounts.feeds.filter((feed) => feed.feedId === touchedFeed));
    });
});

describe('markAllRead', () => {
    test('a category: moves its cutoffs, drops the marks it covers (keep-unread ones too) and leaves other feeds alone', async () => {
        const reader = await newUser(testDb.db);
        const design = await newCategory(testDb.db, reader);
        const markedFeed = await newFeed(testDb.db);
        const freshFeed = await newFeed(testDb.db);
        const uncategorizedFeed = await newFeed(testDb.db);

        await follow(reader, markedFeed, { categoryId: design, readCutoff: minutes(5) });
        await follow(reader, freshFeed, { categoryId: design });
        await follow(reader, uncategorizedFeed);

        const keptUnread = await newItem(markedFeed, minutes(0));

        await newItem(markedFeed, minutes(10));
        await newItem(freshFeed, minutes(10));

        const elsewhere = await newItem(uncategorizedFeed, minutes(10));

        await mark(reader, keptUnread, false);
        await mark(reader, elsewhere, true);

        const result = await markAllRead(testDb.db, reader, { scope: { kind: 'category', categoryId: design }, asOf: new Date(minutes(20)) });

        expect(result.asOf).toBe('2026-03-01T10:20:00.000Z');
        expect(byFeedId(result.undo?.cutoffs ?? [])).toEqual(
            byFeedId([
                { feedId: markedFeed, readCutoff: minutes(5) },
                { feedId: freshFeed, readCutoff: null },
            ]),
        );
        expect(result.undo?.marks).toEqual([{ itemId: keptUnread, isRead: false }]);
        expect(await cutoffOf(reader, markedFeed)).toBe(minutes(20));
        expect(await cutoffOf(reader, freshFeed)).toBe(minutes(20));
        expect(await cutoffOf(reader, uncategorizedFeed)).toBeNull();
        expect(await marksOf(reader)).toEqual([{ itemId: elsewhere, isRead: true }]);
        expect(byFeedId(result.counts.feeds)).toEqual(
            byFeedId([
                { feedId: markedFeed, categoryId: design, items: 2, unread: 0 },
                { feedId: freshFeed, categoryId: design, items: 1, unread: 0 },
            ]),
        );
        expect((await countItems(testDb.db, reader)).categories).toEqual([
            { categoryId: design, items: 3, unread: 0 },
            { categoryId: null, items: 1, unread: 0 },
        ]);
    });

    test('items first seen at or after asOf stay unread, and marks on them stay', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed(testDb.db);

        await follow(reader, feed);

        const before = await newItem(feed, minutes(10));
        const atAsOf = await newItem(feed, minutes(20));
        const after = await newItem(feed, minutes(30));

        await mark(reader, after, true);
        await markAllRead(testDb.db, reader, { scope: { kind: 'all' }, asOf: new Date(minutes(20)) });

        expect(await isRead(reader, before)).toBe(true);
        expect(await isRead(reader, atAsOf)).toBe(false);
        expect(await marksOf(reader)).toEqual([{ itemId: after, isRead: true }]);
    });

    test('never moves a cutoff back, and leaves an unmoved cutoff out of the undo', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed(testDb.db);

        await follow(reader, feed, { readCutoff: minutes(50) });

        const result = await markAllRead(testDb.db, reader, { scope: { kind: 'feed', feedId: feed }, asOf: new Date(minutes(20)) });

        expect(await cutoffOf(reader, feed)).toBe(minutes(50));
        expect(result.undo).toEqual({ asOf: '2026-03-01T10:20:00.000Z', cutoffs: [], marks: [] });
    });

    test('caps an asOf in the future at Postgres\'s now, and uses that now when there is none', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed(testDb.db);

        await follow(reader, feed);

        const before = Date.now();
        const future = await markAllRead(testDb.db, reader, { scope: { kind: 'all' }, asOf: new Date('2999-01-01T00:00:00Z') });
        const unset = await markAllRead(testDb.db, reader, { scope: { kind: 'all' }, asOf: null });
        const after = Date.now();

        for (const result of [future, unset]) {
            expect(Date.parse(result.asOf)).toBeGreaterThanOrEqual(before);
            expect(Date.parse(result.asOf)).toBeLessThanOrEqual(after);
        }

        expect(await cutoffOf(reader, feed)).toBe(unset.asOf.replace('Z', '000Z'));
    });

    test.each([
        ['everything', 'all'],
        ['one feed', 'feed'],
        ['Uncategorized', 'uncategorized'],
    ] as const)('%s changes only its own subscriptions and answers with their counts', async (_case, kind) => {
        const reader = await newUser(testDb.db);
        const design = await newCategory(testDb.db, reader);
        const categorizedFeed = await newFeed(testDb.db);
        const uncategorizedFeed = await newFeed(testDb.db);

        await follow(reader, categorizedFeed, { categoryId: design });
        await follow(reader, uncategorizedFeed);
        await newItem(categorizedFeed, minutes(0));
        await newItem(uncategorizedFeed, minutes(0));

        const scopes: Record<typeof kind, ItemScope> = {
            all: { kind: 'all' },
            feed: { kind: 'feed', feedId: categorizedFeed },
            uncategorized: { kind: 'category', categoryId: null },
        };

        const result = await markAllRead(testDb.db, reader, { scope: scopes[kind], asOf: null });

        const movedFeeds = result.undo?.cutoffs.map((cutoff) => cutoff.feedId).sort();
        const countedFeeds = result.counts.feeds.map((feed) => feed.feedId).sort();
        const expectedFeeds = { all: [categorizedFeed, uncategorizedFeed].sort(), feed: [categorizedFeed], uncategorized: [uncategorizedFeed] }[kind];

        expect(movedFeeds).toEqual(expectedFeeds);
        expect(countedFeeds).toEqual(expectedFeeds);
        expect((await countItems(testDb.db, reader)).total.unread).toBe(2 - expectedFeeds.length);
    });

    test('an empty category is a no-op with an empty undo and no counts', async () => {
        const reader = await newUser(testDb.db);
        const empty = await newCategory(testDb.db, reader);

        const result = await markAllRead(testDb.db, reader, { scope: { kind: 'category', categoryId: empty }, asOf: null });

        expect(result.undo).toEqual({ asOf: result.asOf, cutoffs: [], marks: [] });
        expect(result.counts).toEqual({ feeds: [] });
    });

    test('another reader\'s category or feed → 404, and their cutoff stays', async () => {
        const reader = await newUser(testDb.db);
        const otherReader = await newUser(testDb.db);
        const theirCategory = await newCategory(testDb.db, otherReader);
        const theirFeed = await newFeed(testDb.db);

        await follow(otherReader, theirFeed, { categoryId: theirCategory });

        const categoryError = await httpErrorFrom(markAllRead(testDb.db, reader, { scope: { kind: 'category', categoryId: theirCategory }, asOf: null }));
        const feedError = await httpErrorFrom(markAllRead(testDb.db, reader, { scope: { kind: 'feed', feedId: theirFeed }, asOf: null }));

        expect(categoryError).toMatchObject({ status: 404, code: 'category_not_found' });
        expect(feedError).toMatchObject({ status: 404, code: 'feed_not_found' });
        expect(await cutoffOf(otherReader, theirFeed)).toBeNull();
    });

    test(`more than ${MAX_UNDO_ENTRIES} marks removed → undo is null, but the marks are still removed`, async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed(testDb.db);

        await follow(reader, feed);

        const ids = Array.from({ length: MAX_UNDO_ENTRIES + 1 }, () => crypto.randomUUID());

        await testDb.db.insert(items).values(ids.map((id) => itemRow(id, feed, minutes(0))));
        await testDb.db.insert(itemReadStates).values(ids.map((itemId) => ({ userId: reader, itemId, isRead: true })));

        const result = await markAllRead(testDb.db, reader, { scope: { kind: 'all' }, asOf: null });

        expect(result.undo).toBeNull();
        expect(await marksOf(reader)).toEqual([]);
    });
});

describe('undoMarkAllRead', () => {
    test('puts back the cutoffs, marks and counts from before the mark-all', async () => {
        const reader = await newUser(testDb.db);
        const design = await newCategory(testDb.db, reader);
        const markedFeed = await newFeed(testDb.db);
        const freshFeed = await newFeed(testDb.db);

        await follow(reader, markedFeed, { categoryId: design, readCutoff: '2026-03-01T10:05:00.123456Z' });
        await follow(reader, freshFeed);

        const keptUnread = await newItem(markedFeed, minutes(0));
        const readEarly = await newItem(freshFeed, minutes(1));

        await newItem(freshFeed, minutes(2));
        await mark(reader, keptUnread, false);
        await mark(reader, readEarly, true);

        const countsBefore = await countItems(testDb.db, reader);
        const marksBefore = await marksOf(reader);

        const { undo } = await markAllRead(testDb.db, reader, { scope: { kind: 'all' }, asOf: null });

        if (!undo)
            throw new Error('expected an undo');

        const result = await undoMarkAllRead(testDb.db, reader, undo);

        expect(await countItems(testDb.db, reader)).toEqual(countsBefore);
        expect(byFeedId(result.counts.feeds)).toEqual(byFeedId(countsBefore.feeds));
        expect(await marksOf(reader)).toEqual(marksBefore);
        expect(await cutoffOf(reader, markedFeed)).toBe('2026-03-01T10:05:00.123456Z');
        expect(await cutoffOf(reader, freshFeed)).toBeNull();
    });

    test('restores exactly, overwriting a change made after the mark-all', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed(testDb.db);

        await follow(reader, feed);

        const item = await newItem(feed, minutes(0));

        const { undo } = await markAllRead(testDb.db, reader, { scope: { kind: 'all' }, asOf: null });

        if (!undo)
            throw new Error('expected an undo');

        await setItemsRead(testDb.db, reader, { itemIds: [item], isRead: false });
        await undoMarkAllRead(testDb.db, reader, undo);

        expect(await isRead(reader, item)).toBe(false);
        expect(await cutoffOf(reader, feed)).toBeNull();
        expect(await marksOf(reader)).toEqual([]);
    });

    test('a mark made since on a covered item does not survive the undo (read by hand → unread again)', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed(testDb.db);

        await follow(reader, feed);

        const item = await newItem(feed, minutes(0));

        const { undo } = await markAllRead(testDb.db, reader, { scope: { kind: 'all' }, asOf: null });

        if (!undo)
            throw new Error('expected an undo');

        await setItemsRead(testDb.db, reader, { itemIds: [item], isRead: false });
        await setItemsRead(testDb.db, reader, { itemIds: [item], isRead: true });
        await undoMarkAllRead(testDb.db, reader, undo);

        expect(await isRead(reader, item)).toBe(false);
    });

    test(`an undo naming ${MAX_UNDO_ENTRIES} feeds the reader doesn't follow changes nothing`, async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed(testDb.db);

        await follow(reader, feed, { readCutoff: minutes(30) });

        const madeUpCutoffs = Array.from({ length: MAX_UNDO_ENTRIES }, () => ({ feedId: crypto.randomUUID(), readCutoff: null }));

        const result = await undoMarkAllRead(testDb.db, reader, { asOf: NOW.toISOString(), cutoffs: madeUpCutoffs, marks: [] });

        expect(await cutoffOf(reader, feed)).toBe(minutes(30));
        expect(result.counts).toEqual({ feeds: [] });
    });

    test('skips feeds and items that aren\'t the reader\'s, leaving the other reader\'s state unchanged', async () => {
        const reader = await newUser(testDb.db);
        const otherReader = await newUser(testDb.db);
        const theirFeed = await newFeed(testDb.db);

        await follow(otherReader, theirFeed, { readCutoff: minutes(30) });

        const theirItem = await newItem(theirFeed, minutes(0));

        await mark(otherReader, theirItem, false);
        await undoMarkAllRead(testDb.db, reader, {
            asOf: NOW.toISOString(),
            cutoffs: [{ feedId: theirFeed, readCutoff: null }],
            marks: [
                { itemId: theirItem, isRead: true },
                { itemId: SAMPLE_UUID, isRead: true },
            ],
        });

        expect(await cutoffOf(otherReader, theirFeed)).toBe(minutes(30));
        expect(await marksOf(otherReader)).toEqual([{ itemId: theirItem, isRead: false }]);
        expect(await marksOf(reader)).toEqual([]);
    });
});
