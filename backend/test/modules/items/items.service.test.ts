// The items service against in-memory Postgres (PGlite), including that a reader only ever sees their own data.

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { and, eq, sql } from 'drizzle-orm';
import type { ItemSummary } from '@frontpage/shared';
import { feeds, itemReadStates, items, subscriptions } from '../../../src/db/schema';
import { decodeCursor } from '../../../src/modules/items/items.cursor';
import { IS_READ, countItems, getItem, listItems } from '../../../src/modules/items/items.service';
import type { ItemListQuery } from '../../../src/modules/items/items.types';
import { createTestDb } from '../../helpers/test-db';
import { httpErrorFrom } from '../../helpers/errors';
import { SAMPLE_UUID, newCategory, newUser } from '../../helpers/factories';

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

// A fixed item id ending in `n`, so a test knows which of two items with the same time sorts first (the bigger id).
function itemId(n: number): string {
    return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

// Inserts a healthy feed called `title` (a new item at NOW) and returns its id.
async function newFeed(title: string, overrides: { imageUrl?: string; siteUrl?: string; lastErrorCode?: 'timeout' } = {}): Promise<string> {
    const [row] = await testDb.db
        .insert(feeds)
        .values({
            url: `https://feeds.example/${crypto.randomUUID()}`,
            title,
            imageUrl: overrides.imageUrl ?? null,
            siteUrl: overrides.siteUrl ?? null,
            lastErrorCode: overrides.lastErrorCode ?? null,
            lastSuccessAt: NOW,
            latestItemAt: NOW,
        })
        .returning({ id: feeds.id });

    if (!row)
        throw new Error('Inserting the feed returned no row');

    return row.id;
}

// Subscribes `userId` to `feedId`. `readCutoff` is microsecond ISO text, cast in SQL so no digits are lost.
async function follow(userId: string, feedId: string, overrides: { categoryId?: string; customTitle?: string; readCutoff?: string } = {}) {
    await testDb.db.insert(subscriptions).values({
        userId,
        feedId,
        categoryId: overrides.categoryId ?? null,
        customTitle: overrides.customTitle ?? null,
        readCutoff: overrides.readCutoff ? sql`${overrides.readCutoff}::timestamptz` : null,
    });
}

// Inserts an item in `feedId` first seen at `firstSeenAt` (microsecond ISO text), undated unless `publishedAt` is given; returns its id.
async function newItem(feedId: string, firstSeenAt: string, overrides: { id?: string; publishedAt?: string; title?: string } = {}): Promise<string> {
    const id = overrides.id ?? crypto.randomUUID();

    await testDb.db.insert(items).values({
        id,
        feedId,
        guid: id,
        url: `https://site.example/${id}`,
        title: overrides.title ?? `Item ${id.slice(-4)}`,
        author: 'Jane Doe',
        summary: 'A short excerpt.',
        contentHtml: '<p>The whole article.</p>',
        hasFullContent: true,
        firstSeenAt: sql`${firstSeenAt}::timestamptz`,
        publishedAt: overrides.publishedAt ? sql`${overrides.publishedAt}::timestamptz` : null,
        contentHash: 'hash',
    });

    return id;
}

// Records that `userId` marked `itemId` read (true) or unread (false).
async function mark(userId: string, itemId: string, isRead: boolean) {
    await testDb.db.insert(itemReadStates).values({ userId, itemId, isRead });
}

// A list query with the defaults (everything, all items, newest first, 30 per page, first page) and `overrides`.
function query(overrides: Partial<ItemListQuery> = {}): ItemListQuery {
    return { scope: { kind: 'all' }, unreadOnly: false, order: 'newest', limit: 30, cursor: null, ...overrides };
}

// Every item of the list, following nextCursor page by page until it is null.
async function listAll(userId: string, overrides: Partial<ItemListQuery> = {}): Promise<ItemSummary[]> {
    const all: ItemSummary[] = [];
    let cursor: ItemListQuery['cursor'] = null;

    for (let page = 0; page < 100; page++) {
        const result = await listItems(testDb.db, userId, query({ ...overrides, cursor }), NOW);

        all.push(...result.items);

        if (!result.nextCursor)
            return all;

        cursor = decodeCursor(result.nextCursor);
    }

    throw new Error('listAll: more than 100 pages');
}

// The ids of `list`, in order.
function idsOf(list: { id: string }[]): string[] {
    return list.map((item) => item.id);
}

describe('listItems: scopes', () => {
    test('"all" lists every feed the reader follows, and nothing from a feed they do not follow', async () => {
        const reader = await newUser(testDb.db);
        const [css, design, other] = [await newFeed('CSS'), await newFeed('Design'), await newFeed('Not followed')];

        await follow(reader, css);
        await follow(reader, design);

        const cssItem = await newItem(css, minutes(1));
        const designItem = await newItem(design, minutes(2));

        await newItem(other, minutes(3));

        const page = await listItems(testDb.db, reader, query(), NOW);

        expect(idsOf(page.items)).toEqual([designItem, cssItem]);
        expect(page.nextCursor).toBeNull();
    });

    test('a feed, a category and Uncategorized each list only their own items', async () => {
        const reader = await newUser(testDb.db);
        const designCategory = await newCategory(testDb.db, reader, 'Design');
        const [a, b, c] = [await newFeed('A'), await newFeed('B'), await newFeed('C')];

        await follow(reader, a, { categoryId: designCategory });
        await follow(reader, b, { categoryId: designCategory });
        await follow(reader, c);

        const [itemA, itemB, itemC] = [await newItem(a, minutes(1)), await newItem(b, minutes(2)), await newItem(c, minutes(3))];

        const feedPage = await listItems(testDb.db, reader, query({ scope: { kind: 'feed', feedId: a } }), NOW);
        const categoryPage = await listItems(testDb.db, reader, query({ scope: { kind: 'category', categoryId: designCategory } }), NOW);
        const uncategorizedPage = await listItems(testDb.db, reader, query({ scope: { kind: 'category', categoryId: null } }), NOW);

        expect(idsOf(feedPage.items)).toEqual([itemA]);
        expect(idsOf(categoryPage.items)).toEqual([itemB, itemA]);
        expect(idsOf(uncategorizedPage.items)).toEqual([itemC]);
    });

    test('an empty category, an empty Uncategorized and a feed with no items give an empty page, not a 404', async () => {
        const reader = await newUser(testDb.db);
        const emptyCategory = await newCategory(testDb.db, reader, 'Empty');
        const quietFeed = await newFeed('Quiet');

        await follow(reader, quietFeed, { categoryId: emptyCategory });

        for (const scope of [
            { kind: 'category', categoryId: emptyCategory },
            { kind: 'category', categoryId: null },
            { kind: 'feed', feedId: quietFeed },
            { kind: 'all' },
        ] as const)
            expect(await listItems(testDb.db, reader, query({ scope }), NOW)).toEqual({ items: [], nextCursor: null });
    });
});

describe('listItems: authorization', () => {
    test('a feed only another reader follows, or a random id → 404 feed_not_found', async () => {
        const [ada, grace] = [await newUser(testDb.db), await newUser(testDb.db)];
        const gracesFeed = await newFeed("Grace's feed");

        await follow(grace, gracesFeed);
        await newItem(gracesFeed, minutes(1));

        for (const feedId of [gracesFeed, SAMPLE_UUID]) {
            const err = await httpErrorFrom(listItems(testDb.db, ada, query({ scope: { kind: 'feed', feedId } }), NOW));

            expect(err).toMatchObject({ status: 404, code: 'feed_not_found', message: 'Feed not found' });
        }
    });

    test("another reader's category, or a random id → 404 category_not_found", async () => {
        const [ada, grace] = [await newUser(testDb.db), await newUser(testDb.db)];
        const gracesCategory = await newCategory(testDb.db, grace, 'Design');
        const feed = await newFeed('Shared');

        await follow(grace, feed, { categoryId: gracesCategory });
        await newItem(feed, minutes(1));

        for (const categoryId of [gracesCategory, SAMPLE_UUID]) {
            const err = await httpErrorFrom(listItems(testDb.db, ada, query({ scope: { kind: 'category', categoryId } }), NOW));

            expect(err).toMatchObject({ status: 404, code: 'category_not_found' });
        }
    });

    test('on a feed both follow, each reader sees their own read state and their own title for it', async () => {
        const [ada, grace] = [await newUser(testDb.db), await newUser(testDb.db)];
        const feed = await newFeed('CSS-Tricks');

        await follow(ada, feed);
        await follow(grace, feed, { customTitle: "Grace's CSS" });

        const item = await newItem(feed, minutes(1));

        await mark(grace, item, true);

        const [adasItem] = (await listItems(testDb.db, ada, query(), NOW)).items;
        const [gracesItem] = (await listItems(testDb.db, grace, query(), NOW)).items;

        expect(adasItem).toMatchObject({ isRead: false, feed: { title: 'CSS-Tricks' } });
        expect(gracesItem).toMatchObject({ isRead: true, feed: { title: "Grace's CSS" } });
    });
});

describe('listItems: the read rule', () => {
    test('without a read cutoff or a mark, an item is unread', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed');

        await follow(reader, feed);
        await newItem(feed, minutes(1));

        expect((await listItems(testDb.db, reader, query(), NOW)).items[0]!.isRead).toBe(false);
    });

    test('an item first seen before the cutoff is read; at or after it, unread (to the microsecond)', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed');

        await follow(reader, feed, { readCutoff: '2026-03-01T10:00:00.000002Z' });

        const before = await newItem(feed, '2026-03-01T10:00:00.000001Z');
        const at = await newItem(feed, '2026-03-01T10:00:00.000002Z');
        const after = await newItem(feed, '2026-03-01T10:00:00.000003Z');

        const readById = Object.fromEntries((await listItems(testDb.db, reader, query(), NOW)).items.map((item) => [item.id, item.isRead]));

        expect(readById).toEqual({ [before]: true, [at]: false, [after]: false });
    });

    test('a mark beats the cutoff both ways: marked unread before it, marked read after it', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed');

        await follow(reader, feed, { readCutoff: minutes(10) });

        const oldItem = await newItem(feed, minutes(1));
        const newItemId = await newItem(feed, minutes(20));

        await mark(reader, oldItem, false);
        await mark(reader, newItemId, true);

        const readById = Object.fromEntries((await listItems(testDb.db, reader, query(), NOW)).items.map((item) => [item.id, item.isRead]));

        expect(readById).toEqual({ [oldItem]: false, [newItemId]: true });
    });

    test('unreadOnly lists exactly the unread items', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed');

        await follow(reader, feed, { readCutoff: minutes(10) });

        const markedUnread = await newItem(feed, minutes(1));

        await newItem(feed, minutes(2));

        const fresh = await newItem(feed, minutes(20));
        const markedRead = await newItem(feed, minutes(21));

        await mark(reader, markedUnread, false);
        await mark(reader, markedRead, true);

        const page = await listItems(testDb.db, reader, query({ unreadOnly: true }), NOW);

        expect(idsOf(page.items)).toEqual([fresh, markedUnread]);
        expect(page.items.every((item) => !item.isRead)).toBe(true);
    });

    test('IS_READ works in a hand-written query that joins items, the subscription and the read state (the contract for KAN-25)', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed');

        await follow(reader, feed, { readCutoff: minutes(10) });

        const oldItem = await newItem(feed, minutes(1));
        const freshItem = await newItem(feed, minutes(20));

        const rows = await testDb.db
            .select({ id: items.id, isRead: IS_READ })
            .from(items)
            .innerJoin(subscriptions, and(eq(subscriptions.feedId, items.feedId), eq(subscriptions.userId, reader)))
            .leftJoin(itemReadStates, and(eq(itemReadStates.itemId, items.id), eq(itemReadStates.userId, reader)));

        expect(Object.fromEntries(rows.map((row) => [row.id, row.isRead]))).toEqual({ [oldItem]: true, [freshItem]: false });
    });
});

describe('listItems: order and paging', () => {
    test('newest and oldest across three interleaved feeds, two per page, give the full order with no repeats', async () => {
        const reader = await newUser(testDb.db);
        const feedIds = [await newFeed('A'), await newFeed('B'), await newFeed('C')];

        for (const feedId of feedIds)
            await follow(reader, feedId);

        // Item i is published at minute i, round-robin across the feeds (the first is dated differently from when it was seen).
        const created: string[] = [];

        for (let i = 0; i < 7; i++)
            created.push(await newItem(feedIds[i % 3]!, minutes(100 + i), { publishedAt: minutes(i) }));

        expect(idsOf(await listAll(reader, { limit: 2 }))).toEqual([...created].reverse());
        expect(idsOf(await listAll(reader, { limit: 2, order: 'oldest' }))).toEqual(created);
    });

    test('when the items fill the last page exactly, nextCursor is null: there is never an empty extra page', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed');

        await follow(reader, feed);

        for (let i = 0; i < 4; i++)
            await newItem(feed, minutes(i));

        const first = await listItems(testDb.db, reader, query({ limit: 2 }), NOW);
        const second = await listItems(testDb.db, reader, query({ limit: 2, cursor: decodeCursor(first.nextCursor!) }), NOW);

        expect(first.items).toHaveLength(2);
        expect(first.nextCursor).not.toBeNull();
        expect(second.items).toHaveLength(2);
        expect(second.nextCursor).toBeNull();
    });

    test('one item per page across 3 feeds × 5 items loses nothing (each feed reads only one page ahead)', async () => {
        const reader = await newUser(testDb.db);
        const created: string[] = [];

        for (let feedNumber = 0; feedNumber < 3; feedNumber++) {
            const feed = await newFeed(`Feed ${feedNumber}`);

            await follow(reader, feed);

            for (let i = 0; i < 5; i++)
                created.push(await newItem(feed, minutes(feedNumber * 5 + i)));
        }

        expect(idsOf(await listAll(reader, { limit: 1 }))).toEqual([...created].reverse());
    });

    test('items that share a millisecond page in the right order, split by microseconds and then by id', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed');

        await follow(reader, feed);

        const x = await newItem(feed, '2026-03-01T10:00:00.123457Z', { id: itemId(1) });
        const y = await newItem(feed, '2026-03-01T10:00:00.123456Z', { id: itemId(3) });
        const z = await newItem(feed, '2026-03-01T10:00:00.123456Z', { id: itemId(2) });

        // A cursor rounded to the millisecond (.123) would skip y and z after x, or repeat them.
        expect(idsOf(await listAll(reader, { limit: 1 }))).toEqual([x, y, z]);
        expect(idsOf(await listAll(reader, { limit: 1, order: 'oldest' }))).toEqual([z, y, x]);
    });

    test('marking items read between pages of the unread list never skips or repeats an unread item', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed');

        await follow(reader, feed);

        // a is the newest: newest first, the unread list starts a, b, c, d, e, f.
        const [f, e, d, c, b, a] = [
            await newItem(feed, minutes(1)),
            await newItem(feed, minutes(2)),
            await newItem(feed, minutes(3)),
            await newItem(feed, minutes(4)),
            await newItem(feed, minutes(5)),
            await newItem(feed, minutes(6)),
        ];

        const page1 = await listItems(testDb.db, reader, query({ unreadOnly: true, limit: 2 }), NOW);

        await mark(reader, b, true);
        await mark(reader, d, true);

        const newer = await newItem(feed, minutes(50));
        const page2 = await listItems(testDb.db, reader, query({ unreadOnly: true, limit: 2, cursor: decodeCursor(page1.nextCursor!) }), NOW);
        const page3 = await listItems(testDb.db, reader, query({ unreadOnly: true, limit: 2, cursor: decodeCursor(page2.nextCursor!) }), NOW);

        expect(idsOf(page1.items)).toEqual([a, b]);
        expect(idsOf(page2.items)).toEqual([c, e]);
        expect(idsOf(page3.items)).toEqual([f]);
        expect(page3.nextCursor).toBeNull();
        expect(idsOf([...page2.items, ...page3.items])).not.toContain(newer);
    });

    test('sortAt is the published date, or when the item was first seen if it has none', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed');

        await follow(reader, feed);

        const dated = await newItem(feed, minutes(10), { publishedAt: minutes(1) });
        const undated = await newItem(feed, minutes(20));

        const byId = Object.fromEntries((await listItems(testDb.db, reader, query(), NOW)).items.map((item) => [item.id, item]));

        expect(byId[dated]).toMatchObject({ publishedAt: '2026-03-01T10:01:00.000Z', sortAt: '2026-03-01T10:01:00.000Z' });
        expect(byId[undated]).toMatchObject({ publishedAt: null, sortAt: '2026-03-01T10:20:00.000Z' });
    });
});

describe('listItems: what each item looks like', () => {
    test("carries its feed (the reader's title, icon, category, health) and its own fields, but never the full content", async () => {
        const reader = await newUser(testDb.db);
        const category = await newCategory(testDb.db, reader, 'Frontend');
        const feed = await newFeed('CSS-Tricks', { siteUrl: 'https://css-tricks.com/blog/', lastErrorCode: 'timeout' });

        await follow(reader, feed, { categoryId: category, customTitle: 'CSS' });

        const id = await newItem(feed, minutes(1), { title: 'Container queries' });

        const [item] = (await listItems(testDb.db, reader, query(), NOW)).items;

        expect(item).toEqual({
            id,
            feed: { id: feed, title: 'CSS', iconUrl: 'https://css-tricks.com/favicon.ico', categoryId: category, health: 'error' },
            title: 'Container queries',
            url: `https://site.example/${id}`,
            author: 'Jane Doe',
            summary: 'A short excerpt.',
            imageUrl: null,
            publishedAt: null,
            sortAt: '2026-03-01T10:01:00.000Z',
            hasFullContent: true,
            isRead: false,
        });
        expect(item).not.toHaveProperty('contentHtml');
    });

    test("uses the feed's own title and image when the reader has not renamed it", async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Smashing', { imageUrl: 'https://cdn.example/logo.png', siteUrl: 'https://smashing.example/' });

        await follow(reader, feed);
        await newItem(feed, minutes(1));

        const [item] = (await listItems(testDb.db, reader, query(), NOW)).items;

        expect(item!.feed).toMatchObject({ title: 'Smashing', iconUrl: 'https://cdn.example/logo.png', health: 'active' });
    });
});

describe('countItems', () => {
    test('a reader with nothing gets zeros and empty lists', async () => {
        expect(await countItems(testDb.db, await newUser(testDb.db))).toEqual({ total: { items: 0, unread: 0 }, categories: [], feeds: [] });
    });

    test('lists every category in sidebar order with zeros included, then Uncategorized only when a feed has no category', async () => {
        const reader = await newUser(testDb.db);
        const second = await newCategory(testDb.db, reader, 'Second', 2);
        const first = await newCategory(testDb.db, reader, 'First', 1);
        const empty = await newCategory(testDb.db, reader, 'Empty', 3);
        const [a, b, quiet] = [await newFeed('A'), await newFeed('B'), await newFeed('Quiet')];

        await follow(reader, a, { categoryId: first });
        await follow(reader, b);
        await follow(reader, quiet, { categoryId: second });
        await newItem(a, minutes(1));
        await newItem(a, minutes(2));
        await newItem(b, minutes(3));

        const counts = await countItems(testDb.db, reader);

        expect(counts.categories).toEqual([
            { categoryId: first, items: 2, unread: 2 },
            { categoryId: second, items: 0, unread: 0 },
            { categoryId: empty, items: 0, unread: 0 },
            { categoryId: null, items: 1, unread: 1 },
        ]);
        expect(counts.total).toEqual({ items: 3, unread: 3 });
        expect(counts.feeds).toContainEqual({ feedId: quiet, categoryId: second, items: 0, unread: 0 });
        expect(counts.feeds).toHaveLength(3);
    });

    test('without feeds outside a category, there is no Uncategorized entry', async () => {
        const reader = await newUser(testDb.db);
        const category = await newCategory(testDb.db, reader, 'Only');
        const feed = await newFeed('A');

        await follow(reader, feed, { categoryId: category });

        expect((await countItems(testDb.db, reader)).categories).toEqual([{ categoryId: category, items: 0, unread: 0 }]);
    });

    test("another reader's feeds and marks never count", async () => {
        const [ada, grace] = [await newUser(testDb.db), await newUser(testDb.db)];
        const shared = await newFeed('Shared');
        const gracesOwn = await newFeed("Grace's own");

        await follow(ada, shared);
        await follow(grace, shared);
        await follow(grace, gracesOwn);

        const item = await newItem(shared, minutes(1));

        await newItem(gracesOwn, minutes(2));
        await mark(grace, item, true);

        expect(await countItems(testDb.db, ada)).toEqual({
            total: { items: 1, unread: 1 },
            categories: [{ categoryId: null, items: 1, unread: 1 }],
            feeds: [{ feedId: shared, categoryId: null, items: 1, unread: 1 }],
        });
    });

    test('for every scope, the counts equal what paging through the list returns', async () => {
        const [ada, grace] = [await newUser(testDb.db), await newUser(testDb.db)];
        const category = await newCategory(testDb.db, ada, 'Design');
        const [cutFeed, markedFeed, looseFeed] = [await newFeed('Cut'), await newFeed('Marked'), await newFeed('Loose')];

        await follow(ada, cutFeed, { categoryId: category, readCutoff: minutes(5) });
        await follow(ada, markedFeed, { categoryId: category });
        await follow(ada, looseFeed);
        await follow(grace, looseFeed);

        const cutItems = [];

        for (let i = 0; i < 8; i++)
            cutItems.push(await newItem(cutFeed, minutes(i)));

        const markedItems = [];

        for (let i = 0; i < 5; i++)
            markedItems.push(await newItem(markedFeed, minutes(i)));

        const looseItems = [await newItem(looseFeed, minutes(1)), await newItem(looseFeed, minutes(2))];

        await mark(ada, cutItems[1]!, false);
        await mark(ada, cutItems[7]!, true);
        await mark(ada, markedItems[0]!, true);
        await mark(ada, markedItems[1]!, false);
        await mark(grace, looseItems[0]!, true);

        const counts = await countItems(testDb.db, ada);
        const scopes: [ItemListQuery['scope'], { items: number; unread: number }][] = [
            [{ kind: 'all' }, counts.total],
            [{ kind: 'category', categoryId: category }, counts.categories.find((entry) => entry.categoryId === category)!],
            [{ kind: 'category', categoryId: null }, counts.categories.find((entry) => entry.categoryId === null)!],
            ...counts.feeds.map((entry): [ItemListQuery['scope'], typeof entry] => [{ kind: 'feed', feedId: entry.feedId }, entry]),
        ];

        // Unread: Cut 3 (minutes 5-7) + 1 marked unread - 1 marked read; Marked 5 - 1 marked read; Loose 2 (Grace's mark is hers).
        expect(counts.total).toEqual({ items: 15, unread: 9 });

        for (const [scope, expected] of scopes) {
            expect((await listAll(ada, { scope, limit: 3 })).length).toBe(expected.items);
            expect((await listAll(ada, { scope, limit: 3, unreadOnly: true })).length).toBe(expected.unread);
        }
    });
});

describe('getItem', () => {
    test('returns the item with its full content, and opening it does not change any read state', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed', { siteUrl: 'https://site.example/' });

        await follow(reader, feed);

        const id = await newItem(feed, minutes(1), { title: 'Full article' });
        const readStatesBefore = await testDb.db.select().from(itemReadStates);

        const item = await getItem(testDb.db, reader, id, NOW);

        expect(item).toMatchObject({
            id,
            title: 'Full article',
            contentHtml: '<p>The whole article.</p>',
            updatedAt: null,
            isRead: false,
            feed: { id: feed, title: 'Feed', iconUrl: 'https://site.example/favicon.ico', categoryId: null, health: 'active' },
        });
        expect(await testDb.db.select().from(itemReadStates)).toEqual(readStatesBefore);
    });

    test('shows the reader their own read state for the item', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed');

        await follow(reader, feed, { readCutoff: minutes(10) });

        const id = await newItem(feed, minutes(1));

        expect((await getItem(testDb.db, reader, id, NOW)).isRead).toBe(true);
    });

    test('an item of a feed the reader does not follow, has unfollowed, or that does not exist → the same 404 not_found', async () => {
        const [ada, grace] = [await newUser(testDb.db), await newUser(testDb.db)];
        const gracesFeed = await newFeed("Grace's feed");
        const unfollowed = await newFeed('Unfollowed');

        await follow(grace, gracesFeed);
        await follow(ada, unfollowed);

        const gracesItem = await newItem(gracesFeed, minutes(1));
        const oldItem = await newItem(unfollowed, minutes(2));

        await testDb.db.delete(subscriptions).where(eq(subscriptions.userId, ada));

        for (const id of [gracesItem, oldItem, SAMPLE_UUID]) {
            const err = await httpErrorFrom(getItem(testDb.db, ada, id, NOW));

            expect(err).toMatchObject({ status: 404, code: 'not_found', message: 'Item not found' });
        }
    });
});

describe('how many queries each call makes', () => {
    test('a list page is one query, whatever the number of feeds; an empty filtered page adds one ownership check', async () => {
        const reader = await newUser(testDb.db);
        const quietFeed = await newFeed('Quiet');

        await follow(reader, quietFeed);

        for (let i = 0; i < 5; i++) {
            const feed = await newFeed(`Feed ${i}`);

            await follow(reader, feed);
            await newItem(feed, minutes(i));
        }

        testDb.queries.length = 0;
        await listItems(testDb.db, reader, query(), NOW);
        expect(testDb.queries).toHaveLength(1);

        testDb.queries.length = 0;
        await listItems(testDb.db, reader, query({ scope: { kind: 'feed', feedId: quietFeed } }), NOW);
        expect(testDb.queries).toHaveLength(2);
    });

    test('counts are two queries and one item is one query', async () => {
        const reader = await newUser(testDb.db);
        const feed = await newFeed('Feed');

        await follow(reader, feed);

        const id = await newItem(feed, minutes(1));

        testDb.queries.length = 0;
        await countItems(testDb.db, reader);
        expect(testDb.queries).toHaveLength(2);

        testDb.queries.length = 0;
        await getItem(testDb.db, reader, id, NOW);
        expect(testDb.queries).toHaveLength(1);
    });
});
