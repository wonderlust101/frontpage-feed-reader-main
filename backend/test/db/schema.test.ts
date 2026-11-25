// The data model against an in-memory Postgres: every migration applies, and the constraints the app relies on hold.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { bookmarks, categories, feeds, itemReadStates, items, subscriptions, userPreferences, users } from '../../src/db/schema';
import { createTestDb } from '../helpers/test-db';
import { newFeed, newUser } from '../helpers/factories';

let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
    testDb = await createTestDb();
});

afterAll(async () => {
    await testDb.close();
});

// Inserts an item into a feed and returns the stored row.
async function newItem(feedId: string, overrides: Partial<typeof items.$inferInsert> = {}) {
    const [row] = await testDb.db
        .insert(items)
        .values({
            feedId,
            guid: crypto.randomUUID(),
            title: 'Rust compiler released',
            summary: 'Faster builds',
            contentHtml: '<p>Faster builds</p>',
            hasFullContent: false,
            contentHash: 'hash',
            ...overrides,
        })
        .returning();

    if (!row)
        throw new Error('Inserting the item returned no row');

    return row;
}

// The Postgres error code (e.g. 23505 unique violation) a failing query threw.
async function errorCode(query: Promise<unknown>): Promise<string | undefined> {
    try {
        await query;
    } catch (err) {
        const cause = (err as { cause?: { code?: string } }).cause;

        return cause?.code ?? (err as { code?: string }).code;
    }

    return undefined;
}

describe('items', () => {
    test('the same guid twice in one feed is rejected', async () => {
        const feedId = await newFeed(testDb.db);

        await newItem(feedId, { guid: 'same' });
        expect(await errorCode(newItem(feedId, { guid: 'same' }))).toBe('23505');
    });

    test('sort_at falls back to first_seen_at, and search matches title words', async () => {
        const feedId = await newFeed(testDb.db);
        const dated = await newItem(feedId, { publishedAt: new Date('2026-01-02T10:00:00.000Z') });
        const undated = await newItem(feedId);

        expect(dated.sortAt).toEqual(new Date('2026-01-02T10:00:00.000Z'));
        expect(undated.sortAt).toEqual(undated.firstSeenAt);

        const found = await testDb.db
            .select({ id: items.id })
            .from(items)
            .where(sql`${items.feedId} = ${feedId} and ${items.search} @@ websearch_to_tsquery('english', 'compilers')`);

        expect(found).toHaveLength(2);
    });
});

describe('foreign keys', () => {
    test('a bookmarked item and a followed feed cannot be deleted', async () => {
        const user = await newUser(testDb.db);
        const feedId = await newFeed(testDb.db);
        const item = await newItem(feedId);

        await testDb.db.insert(bookmarks).values({ userId: user, itemId: item.id });
        await testDb.db.insert(subscriptions).values({ userId: user, feedId });

        expect(await errorCode(testDb.db.delete(items).where(eq(items.id, item.id)))).toBe('23001');
        expect(await errorCode(testDb.db.delete(feeds).where(eq(feeds.id, feedId)))).toBe('23001');
    });

    test('deleting a user deletes all of their data, but not the shared feeds and items', async () => {
        const user = await newUser(testDb.db);
        const feedId = await newFeed(testDb.db);
        const item = await newItem(feedId);
        const [category] = await testDb.db.insert(categories).values({ userId: user, name: 'News', position: 0 }).returning();

        await testDb.db.insert(subscriptions).values({ userId: user, feedId, categoryId: category!.id });
        await testDb.db.insert(itemReadStates).values({ userId: user, itemId: item.id, isRead: true });
        await testDb.db.insert(bookmarks).values({ userId: user, itemId: item.id });
        await testDb.db.insert(userPreferences).values({ userId: user });

        await testDb.db.delete(users).where(eq(users.id, user));

        for (const table of [categories, subscriptions, itemReadStates, bookmarks, userPreferences])
            expect(await testDb.db.select().from(table).where(eq(table.userId, user))).toEqual([]);

        expect(await testDb.db.select().from(items).where(eq(items.id, item.id))).toHaveLength(1);
    });

    test('deleting a category moves its subscriptions to Uncategorized', async () => {
        const user = await newUser(testDb.db);
        const [category] = await testDb.db.insert(categories).values({ userId: user, name: 'News', position: 0 }).returning();
        const [subscription] = await testDb.db
            .insert(subscriptions)
            .values({ userId: user, feedId: await newFeed(testDb.db), categoryId: category!.id })
            .returning();

        await testDb.db.delete(categories).where(eq(categories.id, category!.id));

        const [after] = await testDb.db.select().from(subscriptions).where(eq(subscriptions.id, subscription!.id));

        expect(after!.categoryId).toBeNull();
    });
});

describe('updated_at', () => {
    test('moves forward when a row is updated through Drizzle', async () => {
        const [category] = await testDb.db
            .insert(categories)
            .values({ userId: await newUser(testDb.db), name: 'News', position: 0 })
            .returning();

        await Bun.sleep(5);

        const [renamed] = await testDb.db.update(categories).set({ name: 'World' }).where(eq(categories.id, category!.id)).returning();

        expect(renamed!.updatedAt.getTime()).toBeGreaterThan(category!.updatedAt.getTime());
    });
});

describe('checks and unique names', () => {
    test('category names are unique per user ignoring case', async () => {
        const user = await newUser(testDb.db);

        await testDb.db.insert(categories).values({ userId: user, name: 'News', position: 0 });
        expect(await errorCode(testDb.db.insert(categories).values({ userId: user, name: 'news', position: 1 }))).toBe('23505');
        await testDb.db.insert(categories).values({ userId: await newUser(testDb.db), name: 'news', position: 0 });
    });

    test('preferences reject an unsupported refresh interval or order', async () => {
        const user = await newUser(testDb.db);

        expect(await errorCode(testDb.db.insert(userPreferences).values({ userId: user, refreshIntervalMinutes: 45 }))).toBe('23514');
        expect(await errorCode(testDb.db.insert(userPreferences).values({ userId: user, itemOrder: 'random' as 'newest' }))).toBe('23514');

        const [defaults] = await testDb.db.insert(userPreferences).values({ userId: user }).returning();

        expect(defaults).toMatchObject({ layout: 'list', refreshIntervalMinutes: 30, itemOrder: 'newest', showRead: true });
    });
});
