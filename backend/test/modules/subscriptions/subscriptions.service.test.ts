// The subscriptions service against an in-memory Postgres (PGlite) and the local fake feed server: subscribing (fetch,
// reuse, errors, duplicates), listing with health, renaming and moving, unsubscribing, and that only the owner can touch a subscription.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { and, eq, sql } from 'drizzle-orm';
import { bookmarks, feeds, itemReadStates, items, subscriptions } from '../../../src/db/schema';
import { hostLimiter } from '../../../src/modules/feeds/feeds.service';
import { listSubscriptions, subscribe, unsubscribe, updateSubscription } from '../../../src/modules/subscriptions/subscriptions.service';
import { startFeedServer } from '../../helpers/feed-server';
import { createTestDb } from '../../helpers/test-db';
import { httpErrorFrom } from '../../helpers/errors';
import { SAMPLE_UUID, newCategory, newUser } from '../../helpers/factories';

const T1 = new Date('2026-03-01T10:00:00.000Z');
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let server: ReturnType<typeof startFeedServer>;

beforeAll(async () => {
    testDb = await createTestDb();
    server = startFeedServer();
});

afterAll(async () => {
    await server.stop();
    await testDb.close();
});

beforeEach(async () => {
    await testDb.db.execute(sql`truncate table feeds, users cascade`);
});

afterEach(() => {
    mock.restore();
});

// `ms` milliseconds after T1.
function after(ms: number): Date {
    return new Date(T1.getTime() + ms);
}

// Serves a small RSS feed called `title` at `path` (two undated items, so they count as new when first seen) and returns its URL.
function serveFeed(path: string, title: string, overrides: { image?: string } = {}): string {
    const image = overrides.image ? `<image><url>${overrides.image}</url><title>${title}</title><link>https://site.example/</link></image>` : '';
    const entries = ['one', 'two'].map((guid) => `<item><guid>${guid}</guid><title>${title} ${guid}</title><link>https://site.example/${guid}</link></item>`);

    server.serve(
        path,
        `<?xml version="1.0"?><rss version="2.0"><channel><title>${title}</title><link>https://site.example/</link>` +
            `<description>About ${title}</description>${image}${entries.join('')}</channel></rss>`,
    );

    return `${server.url}${path}`;
}

// Every stored subscription row of `userId`.
function subscriptionRowsOf(userId: string) {
    return testDb.db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
}

describe('subscribe', () => {
    test('fetches and stores a new feed, and answers with its title, description, icon, health and last success', async () => {
        const url = serveFeed('/new.xml', 'CSS Weekly', { image: 'https://site.example/logo.png' });
        const reader = await newUser(testDb.db);

        const subscription = await subscribe(testDb.db, reader, { url }, T1);

        expect(subscription).toMatchObject({
            url,
            title: 'CSS Weekly',
            feedTitle: 'CSS Weekly',
            customTitle: null,
            description: 'About CSS Weekly',
            siteUrl: 'https://site.example/',
            iconUrl: 'https://site.example/logo.png',
            categoryId: null,
            health: 'active',
            lastSuccessAt: T1.toISOString(),
            lastFetchedAt: T1.toISOString(),
            lastError: null,
        });
        expect(await testDb.db.select().from(items).where(eq(items.feedId, subscription.feedId))).toHaveLength(2);
        expect(await subscriptionRowsOf(reader)).toHaveLength(1);
    });

    test("falls back to the site's /favicon.ico when the feed has no image", async () => {
        const subscription = await subscribe(testDb.db, await newUser(testDb.db), { url: serveFeed('/no-image.xml', 'Plain') }, T1);

        expect(subscription.iconUrl).toBe('https://site.example/favicon.ico');
    });

    test('reuses a stored feed fetched successfully under 15 minutes ago, without fetching it again', async () => {
        const url = serveFeed('/fresh.xml', 'Fresh');

        await subscribe(testDb.db, await newUser(testDb.db), { url }, T1);

        const second = await subscribe(testDb.db, await newUser(testDb.db), { url }, after(14 * MINUTE_MS));

        expect(server.hits['/fresh.xml']).toBe(1);
        expect(second.lastSuccessAt).toBe(T1.toISOString());
    });

    test('fetches a stored feed again when its last success is 15+ minutes old', async () => {
        const url = serveFeed('/older.xml', 'Older');

        await subscribe(testDb.db, await newUser(testDb.db), { url }, T1);

        const second = await subscribe(testDb.db, await newUser(testDb.db), { url }, after(20 * MINUTE_MS));

        expect(server.hits['/older.xml']).toBe(2);
        expect(second.lastSuccessAt).toBe(after(20 * MINUTE_MS).toISOString());
    });

    test('fetches a stored feed again when its last fetch failed, even a minute later', async () => {
        const url = serveFeed('/flaky.xml', 'Flaky');

        await subscribe(testDb.db, await newUser(testDb.db), { url }, T1);
        await testDb.db.update(feeds).set({ lastErrorCode: 'http_5xx', lastErrorMessage: 'boom', consecutiveFailures: 1 }).where(eq(feeds.url, url));

        const second = await subscribe(testDb.db, await newUser(testDb.db), { url }, after(MINUTE_MS));

        expect(server.hits['/flaky.xml']).toBe(2);
        expect(second).toMatchObject({ health: 'active', lastError: null });
    });

    test('a page that is not a feed → 422 not_a_feed, and nothing is stored', async () => {
        const reader = await newUser(testDb.db);

        const err = await httpErrorFrom(subscribe(testDb.db, reader, { url: `${server.url}/html` }, T1));

        expect(err).toMatchObject({ status: 422, code: 'not_a_feed' });
        expect(await testDb.db.select().from(feeds)).toEqual([]);
        expect(await subscriptionRowsOf(reader)).toEqual([]);
    });

    test('a feed that is gone → 502 http_4xx with the upstream status, and nothing is stored', async () => {
        const err = await httpErrorFrom(subscribe(testDb.db, await newUser(testDb.db), { url: `${server.url}/gone` }, T1));

        expect(err).toMatchObject({ status: 502, code: 'http_4xx', upstreamStatus: 410 });
        expect(await testDb.db.select().from(feeds)).toEqual([]);
    });

    test('a busy feed host → 429 rate_limited with a wait, and nothing is stored', async () => {
        const reader = await newUser(testDb.db);
        const url = serveFeed('/busy.xml', 'Busy');

        spyOn(hostLimiter, 'acquire').mockResolvedValue(null);

        const err = await httpErrorFrom(subscribe(testDb.db, reader, { url }, T1));

        expect(err).toMatchObject({ status: 429, code: 'rate_limited', retryable: true, retryAfterSeconds: 5 });
        expect(await testDb.db.select().from(feeds)).toEqual([]);
        expect(await subscriptionRowsOf(reader)).toEqual([]);
    });

    test('an empty URL → 400 invalid_url', async () => {
        expect(await httpErrorFrom(subscribe(testDb.db, await newUser(testDb.db), { url: '' }, T1))).toMatchObject({ status: 400, code: 'invalid_url' });
    });

    test("subscribes into one of the reader's categories", async () => {
        const reader = await newUser(testDb.db);
        const design = await newCategory(testDb.db, reader, 'Design');

        const subscription = await subscribe(testDb.db, reader, { url: serveFeed('/design.xml', 'Design'), categoryId: design }, T1);

        expect(subscription.categoryId).toBe(design);
    });

    test('a categoryId that does not exist → 404 category_not_found, before any fetch', async () => {
        const url = serveFeed('/nowhere.xml', 'Nowhere');

        const err = await httpErrorFrom(subscribe(testDb.db, await newUser(testDb.db), { url, categoryId: SAMPLE_UUID }, T1));

        expect(err).toMatchObject({ status: 404, code: 'category_not_found' });
        expect(server.hits['/nowhere.xml']).toBeUndefined();
    });
});

describe('subscribing to a feed the reader already follows', () => {
    test('→ 409 already_subscribed with the existing subscription id, without fetching again', async () => {
        const reader = await newUser(testDb.db);
        const url = serveFeed('/twice.xml', 'Twice');
        const first = await subscribe(testDb.db, reader, { url }, T1);

        const err = await httpErrorFrom(subscribe(testDb.db, reader, { url }, after(DAY_MS)));

        expect(err).toMatchObject({ status: 409, code: 'already_subscribed', subscriptionId: first.id });
        expect(server.hits['/twice.xml']).toBe(1);
        expect(await subscriptionRowsOf(reader)).toHaveLength(1);
    });

    test('→ 409 also when a different URL permanently redirects to it', async () => {
        const reader = await newUser(testDb.db);
        const first = await subscribe(testDb.db, reader, { url: `${server.url}/feed.xml` }, T1);

        const err = await httpErrorFrom(subscribe(testDb.db, reader, { url: `${server.url}/moved-permanently` }, T1));

        expect(err).toMatchObject({ status: 409, code: 'already_subscribed', subscriptionId: first.id });
        expect(await subscriptionRowsOf(reader)).toHaveLength(1);
    });

    test('two subscribes racing for the same feed → one subscription and one 409', async () => {
        const reader = await newUser(testDb.db);
        const url = serveFeed('/race.xml', 'Race');

        const results = await Promise.allSettled([subscribe(testDb.db, reader, { url }, T1), subscribe(testDb.db, reader, { url }, T1)]);

        expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);

        const failure = results.find((result) => result.status === 'rejected');

        expect(failure?.reason).toMatchObject({ status: 409, code: 'already_subscribed' });
        expect(await subscriptionRowsOf(reader)).toHaveLength(1);
    });
});

describe('listSubscriptions', () => {
    test('a new reader has none', async () => {
        expect(await listSubscriptions(testDb.db, await newUser(testDb.db), T1)).toEqual([]);
    });

    test('sorts by the title the reader sees (custom title first), ignoring case', async () => {
        const reader = await newUser(testDb.db);

        await subscribe(testDb.db, reader, { url: serveFeed('/beta.xml', 'beta') }, T1);
        await subscribe(testDb.db, reader, { url: serveFeed('/alpha.xml', 'Alpha') }, T1);

        const gamma = await subscribe(testDb.db, reader, { url: serveFeed('/gamma.xml', 'Gamma') }, T1);

        await updateSubscription(testDb.db, reader, gamma.id, { customTitle: 'aardvark' }, T1);

        const list = await listSubscriptions(testDb.db, reader, T1);

        expect(list.map((subscription) => subscription.title)).toEqual(['aardvark', 'Alpha', 'beta']);
    });

    test("derives each feed's health and reports the last error and last success", async () => {
        const reader = await newUser(testDb.db);
        const now = after(10 * DAY_MS);

        for (const name of ['active', 'stale', 'error', 'dead'])
            await subscribe(testDb.db, reader, { url: serveFeed(`/${name}.xml`, name) }, T1);

        const update = (name: string, values: Partial<typeof feeds.$inferInsert>) =>
            testDb.db
                .update(feeds)
                .set(values)
                .where(eq(feeds.url, `${server.url}/${name}.xml`));

        await update('active', { lastSuccessAt: now, latestItemAt: after(9 * DAY_MS) });
        await update('stale', { lastSuccessAt: now, latestItemAt: new Date(now.getTime() - 40 * DAY_MS) });
        await update('error', { lastErrorCode: 'timeout', lastErrorMessage: 'Too slow', consecutiveFailures: 1 });
        await update('dead', { lastErrorCode: 'http_4xx', lastErrorMessage: 'Gone', consecutiveFailures: 6 });

        const list = await listSubscriptions(testDb.db, reader, now);

        expect(list.map((subscription) => [subscription.title, subscription.health, subscription.lastError?.code ?? null])).toEqual([
            ['active', 'active', null],
            ['dead', 'dead', 'http_4xx'],
            ['error', 'error', 'timeout'],
            ['stale', 'stale', null],
        ]);
        expect(list.find((subscription) => subscription.title === 'dead')).toMatchObject({ lastSuccessAt: T1.toISOString(), lastError: { code: 'http_4xx', message: 'Gone' } });
    });

    test('costs one query however many subscriptions there are', async () => {
        const reader = await newUser(testDb.db);

        for (const name of ['q1', 'q2', 'q3'])
            await subscribe(testDb.db, reader, { url: serveFeed(`/${name}.xml`, name) }, T1);

        testDb.queries.length = 0;

        await listSubscriptions(testDb.db, reader, T1);

        expect(testDb.queries).toHaveLength(1);
    });
});

describe('updateSubscription', () => {
    test("renames, then clearing the custom title shows the feed's own title again", async () => {
        const reader = await newUser(testDb.db);
        const subscription = await subscribe(testDb.db, reader, { url: serveFeed('/rename.xml', 'CSS-Tricks') }, T1);

        const renamed = await updateSubscription(testDb.db, reader, subscription.id, { customTitle: 'My CSS' }, T1);

        expect(renamed).toMatchObject({ title: 'My CSS', customTitle: 'My CSS', feedTitle: 'CSS-Tricks' });

        const cleared = await updateSubscription(testDb.db, reader, subscription.id, { customTitle: null }, T1);

        expect(cleared).toMatchObject({ title: 'CSS-Tricks', customTitle: null });
    });

    test('moves to a category and back to Uncategorized, leaving the custom title alone', async () => {
        const reader = await newUser(testDb.db);
        const design = await newCategory(testDb.db, reader, 'Design');
        const subscription = await subscribe(testDb.db, reader, { url: serveFeed('/move.xml', 'Move') }, T1);

        await updateSubscription(testDb.db, reader, subscription.id, { customTitle: 'Mine' }, T1);

        const moved = await updateSubscription(testDb.db, reader, subscription.id, { categoryId: design }, T1);

        expect(moved).toMatchObject({ categoryId: design, customTitle: 'Mine' });

        const uncategorized = await updateSubscription(testDb.db, reader, subscription.id, { categoryId: null }, T1);

        expect(uncategorized).toMatchObject({ categoryId: null, customTitle: 'Mine' });
    });
});

describe('unsubscribe', () => {
    test("removes the subscription and the reader's read marks on that feed; keeps bookmarks, the feed and everyone else's data", async () => {
        const reader = await newUser(testDb.db);
        const other = await newUser(testDb.db);
        const leaving = await subscribe(testDb.db, reader, { url: serveFeed('/leave.xml', 'Leave') }, T1);
        const staying = await subscribe(testDb.db, reader, { url: serveFeed('/stay.xml', 'Stay') }, T1);

        await subscribe(testDb.db, other, { url: `${server.url}/leave.xml` }, T1);

        const [leaveOne, leaveTwo] = await testDb.db.select({ id: items.id }).from(items).where(eq(items.feedId, leaving.feedId));
        const [stayOne] = await testDb.db.select({ id: items.id }).from(items).where(eq(items.feedId, staying.feedId));

        await testDb.db.insert(itemReadStates).values([
            { userId: reader, itemId: leaveOne!.id, isRead: true },
            { userId: reader, itemId: leaveTwo!.id, isRead: false },
            { userId: reader, itemId: stayOne!.id, isRead: true },
            { userId: other, itemId: leaveOne!.id, isRead: true },
        ]);
        await testDb.db.insert(bookmarks).values({ userId: reader, itemId: leaveOne!.id });

        await unsubscribe(testDb.db, reader, leaving.id);

        expect((await subscriptionRowsOf(reader)).map((subscription) => subscription.id)).toEqual([staying.id]);
        expect(await subscriptionRowsOf(other)).toHaveLength(1);

        const marks = await testDb.db.select({ userId: itemReadStates.userId, itemId: itemReadStates.itemId }).from(itemReadStates);

        expect(marks).toHaveLength(2);
        expect(marks).toContainEqual({ userId: reader, itemId: stayOne!.id });
        expect(marks).toContainEqual({ userId: other, itemId: leaveOne!.id });
        expect(await testDb.db.select().from(bookmarks).where(eq(bookmarks.userId, reader))).toHaveLength(1);
        expect(await testDb.db.select().from(feeds).where(eq(feeds.id, leaving.feedId))).toHaveLength(1);
        expect(await testDb.db.select().from(items).where(eq(items.feedId, leaving.feedId))).toHaveLength(2);
    });

    test('unsubscribing twice → 404 not_found the second time', async () => {
        const reader = await newUser(testDb.db);
        const subscription = await subscribe(testDb.db, reader, { url: serveFeed('/again.xml', 'Again') }, T1);

        await unsubscribe(testDb.db, reader, subscription.id);

        expect(await httpErrorFrom(unsubscribe(testDb.db, reader, subscription.id))).toMatchObject({ status: 404, code: 'not_found' });
    });
});

describe('only the owner can touch a subscription', () => {
    test("another reader can't rename or move it (404 not_found), and it stays unchanged", async () => {
        const owner = await newUser(testDb.db);
        const intruder = await newUser(testDb.db);
        const subscription = await subscribe(testDb.db, owner, { url: serveFeed('/owned.xml', 'Owned') }, T1);

        const renaming = await httpErrorFrom(updateSubscription(testDb.db, intruder, subscription.id, { customTitle: 'Mine now' }, T1));
        const moving = await httpErrorFrom(updateSubscription(testDb.db, intruder, subscription.id, { categoryId: null }, T1));

        expect(renaming).toMatchObject({ status: 404, code: 'not_found' });
        expect(moving).toMatchObject({ status: 404, code: 'not_found' });
        expect(await subscriptionRowsOf(owner)).toEqual([expect.objectContaining({ id: subscription.id, customTitle: null })]);
    });

    test("another reader can't unsubscribe it (404 not_found), and it is still there", async () => {
        const owner = await newUser(testDb.db);
        const subscription = await subscribe(testDb.db, owner, { url: serveFeed('/keep.xml', 'Keep') }, T1);

        expect(await httpErrorFrom(unsubscribe(testDb.db, await newUser(testDb.db), subscription.id))).toMatchObject({ status: 404, code: 'not_found' });
        expect(await subscriptionRowsOf(owner)).toHaveLength(1);
    });

    test('an id that matches no subscription → 404 not_found for update and unsubscribe', async () => {
        const reader = await newUser(testDb.db);

        expect(await httpErrorFrom(updateSubscription(testDb.db, reader, SAMPLE_UUID, { customTitle: 'X' }, T1))).toMatchObject({ status: 404, code: 'not_found' });
        expect(await httpErrorFrom(unsubscribe(testDb.db, reader, SAMPLE_UUID))).toMatchObject({ status: 404, code: 'not_found' });
    });

    test("a reader can't subscribe into another reader's category (404 category_not_found), and nothing is fetched", async () => {
        const othersCategory = await newCategory(testDb.db, await newUser(testDb.db), 'Private');
        const reader = await newUser(testDb.db);
        const url = serveFeed('/sneaky.xml', 'Sneaky');

        const err = await httpErrorFrom(subscribe(testDb.db, reader, { url, categoryId: othersCategory }, T1));

        expect(err).toMatchObject({ status: 404, code: 'category_not_found' });
        expect(server.hits['/sneaky.xml']).toBeUndefined();
        expect(await subscriptionRowsOf(reader)).toEqual([]);
    });

    test("a reader can't move their own subscription into another reader's category, and it stays where it was", async () => {
        const othersCategory = await newCategory(testDb.db, await newUser(testDb.db), 'Private');
        const reader = await newUser(testDb.db);
        const subscription = await subscribe(testDb.db, reader, { url: serveFeed('/mine.xml', 'Mine') }, T1);

        const err = await httpErrorFrom(updateSubscription(testDb.db, reader, subscription.id, { categoryId: othersCategory }, T1));

        expect(err).toMatchObject({ status: 404, code: 'category_not_found' });

        const [row] = await subscriptionRowsOf(reader);

        expect(row?.categoryId).toBeNull();
    });

    test('each reader lists only their own subscriptions, even when they follow the same feed', async () => {
        const ada = await newUser(testDb.db);
        const grace = await newUser(testDb.db);
        const url = serveFeed('/shared.xml', 'Shared');
        const adas = await subscribe(testDb.db, ada, { url }, T1);
        const graces = await subscribe(testDb.db, grace, { url }, T1);

        await subscribe(testDb.db, grace, { url: serveFeed('/graces.xml', 'Only Grace') }, T1);

        expect(adas.feedId).toBe(graces.feedId);
        expect((await listSubscriptions(testDb.db, ada, T1)).map((subscription) => subscription.id)).toEqual([adas.id]);
        expect(await listSubscriptions(testDb.db, grace, T1)).toHaveLength(2);

        const [stored] = await testDb.db
            .select()
            .from(subscriptions)
            .where(and(eq(subscriptions.userId, ada), eq(subscriptions.feedId, adas.feedId)));

        expect(stored?.id).toBe(adas.id);
    });
});
