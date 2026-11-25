// ingestFeed against an in-memory Postgres (PGlite) and the local fake feed server: storing feeds and items,
// deduplicating re-fetches, fetch bookkeeping, redirects and merges, and the number of queries a fetch costs.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { bookmarks, feeds, itemReadStates, items, starterFeeds, subscriptions } from '../../../src/db/schema';
import { HttpError } from '../../../src/errors';
import { ingestFeed } from '../../../src/modules/feeds/feeds.ingest';
import * as feedsService from '../../../src/modules/feeds/feeds.service';
import { ETAG, LAST_MODIFIED, startFeedServer } from '../../helpers/feed-server';
import { readFixture } from '../../helpers/fixtures';
import { createTestDb } from '../../helpers/test-db';
import { httpErrorFrom } from '../../helpers/errors';
import { newUser } from '../../helpers/factories';

type TestItem = { guid: string; title: string; date?: string };

const T1 = new Date('2026-01-01T10:00:00.000Z');
const T2 = new Date('2026-01-02T10:00:00.000Z');
const T3 = new Date('2026-01-03T10:00:00.000Z');

const POST_A: TestItem = { guid: 'a', title: 'Post A', date: 'Mon, 01 Dec 2025 09:00:00 GMT' };
const POST_B: TestItem = { guid: 'b', title: 'Post B', date: 'Tue, 02 Dec 2025 09:00:00 GMT' };
const POST_C: TestItem = { guid: 'c', title: 'Post C', date: 'Wed, 03 Dec 2025 09:00:00 GMT' };

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

// A minimal RSS 2.0 document with these items, so a test can add, edit or drop one between fetches.
function rss(posts: TestItem[]): string {
    const entries = posts.map(
        (post) =>
            `<item><guid>${post.guid}</guid><title>${post.title}</title><link>https://ingest.example/${post.guid}</link>` +
            `<description>About ${post.title}</description>${post.date ? `<pubDate>${post.date}</pubDate>` : ''}</item>`,
    );

    return `<?xml version="1.0"?><rss version="2.0"><channel><title>Ingest Test</title><link>https://ingest.example/</link>${entries.join('')}</channel></rss>`;
}

// The stored feed row at a URL (undefined if there is none).
async function feedAt(url: string) {
    const [row] = await testDb.db.select().from(feeds).where(eq(feeds.url, url));

    return row;
}

// Every stored item of a feed, by guid.
async function itemsOf(feedId: string) {
    const rows = await testDb.db.select().from(items).where(eq(items.feedId, feedId));

    return new Map(rows.map((row) => [row.guid, row]));
}

describe('first ingest', () => {
    test('stores the feed metadata, validators, bookkeeping and every item', async () => {
        server.serve('/css-tricks.xml', readFixture('curated/css-tricks.xml'), {
            headers: { 'Content-Type': 'application/rss+xml', ETag: ETAG, 'Last-Modified': LAST_MODIFIED },
        });

        const url = `${server.url}/css-tricks.xml`;

        const result = await ingestFeed(testDb.db, url, { now: T1 });

        const feed = await feedAt(url);

        expect(feed).toMatchObject({
            id: result.feedId,
            title: 'CSS-Tricks',
            siteUrl: 'https://css-tricks.com/',
            format: 'rss2',
            language: 'en-US',
            etag: ETAG,
            lastModified: LAST_MODIFIED,
            lastFetchedAt: T1,
            lastSuccessAt: T1,
            consecutiveFailures: 0,
            lastErrorCode: null,
        });
        expect(feed!.description).toBeTruthy();

        const stored = await itemsOf(result.feedId);

        expect(stored.size).toBeGreaterThan(0);
        expect(result).toMatchObject({ notModified: false, inserted: stored.size, updated: 0, unchanged: 0, movedFrom: null, mergedFeedId: null });

        const newest = Math.max(...[...stored.values()].map((item) => item.sortAt.getTime()));

        expect(feed!.latestItemAt?.getTime()).toBe(newest);
        expect([...stored.values()].every((item) => item.firstSeenAt.getTime() === T1.getTime())).toBe(true);
    });

    test('a URL whose first fetch fails stores nothing', async () => {
        const err = await httpErrorFrom(ingestFeed(testDb.db, `${server.url}/missing`, { now: T1 }));

        expect(err.code).toBe('http_4xx');
        expect(await testDb.db.select().from(feeds)).toEqual([]);
    });
});

describe('re-fetching', () => {
    test('unchanged content creates no duplicates and keeps ids and first_seen_at', async () => {
        server.serve('/same.xml', rss([POST_A, POST_B]));

        const url = `${server.url}/same.xml`;
        const first = await ingestFeed(testDb.db, url, { now: T1 });
        const before = await itemsOf(first.feedId);

        const second = await ingestFeed(testDb.db, url, { now: T2 });

        expect(second).toMatchObject({ feedId: first.feedId, inserted: 0, updated: 0, unchanged: 2 });
        expect(await itemsOf(first.feedId)).toEqual(before);
        expect((await feedAt(url))!.lastSuccessAt).toEqual(T2);
    });

    test('an edited article is updated in place and keeps its first_seen_at', async () => {
        server.serve('/edit.xml', rss([POST_A, POST_B]));

        const url = `${server.url}/edit.xml`;
        const { feedId } = await ingestFeed(testDb.db, url, { now: T1 });
        const before = (await itemsOf(feedId)).get('a')!;

        server.serve('/edit.xml', rss([{ ...POST_A, title: 'Post A (corrected)' }, POST_B]));

        const result = await ingestFeed(testDb.db, url, { now: T2 });

        const after = (await itemsOf(feedId)).get('a')!;

        expect(result).toMatchObject({ inserted: 0, updated: 1, unchanged: 1 });
        expect(after.title).toBe('Post A (corrected)');
        expect(after.contentHash).not.toBe(before.contentHash);
        expect(after.id).toBe(before.id);
        expect(after.firstSeenAt).toEqual(T1);
    });

    test('a change to any stored field, not just the text, counts as an edit', async () => {
        server.serve('/date-edit.xml', rss([POST_A]));

        const url = `${server.url}/date-edit.xml`;
        const { feedId } = await ingestFeed(testDb.db, url, { now: T1 });

        server.serve('/date-edit.xml', rss([{ ...POST_A, date: 'Thu, 04 Dec 2025 09:00:00 GMT' }]));

        const result = await ingestFeed(testDb.db, url, { now: T2 });

        expect(result.updated).toBe(1);
        expect((await itemsOf(feedId)).get('a')!.publishedAt).toEqual(new Date('2025-12-04T09:00:00.000Z'));
    });

    test('a new article is added and latest_item_at moves forward', async () => {
        server.serve('/grow.xml', rss([POST_A, POST_B]));

        const url = `${server.url}/grow.xml`;
        const { feedId } = await ingestFeed(testDb.db, url, { now: T1 });

        server.serve('/grow.xml', rss([POST_A, POST_B, POST_C]));

        const result = await ingestFeed(testDb.db, url, { now: T2 });

        const stored = await itemsOf(feedId);

        expect(result).toMatchObject({ inserted: 1, updated: 0, unchanged: 2 });
        expect(stored.get('c')!.firstSeenAt).toEqual(T2);
        expect(stored.get('a')!.firstSeenAt).toEqual(T1);
        expect((await feedAt(url))!.latestItemAt).toEqual(new Date('2025-12-03T09:00:00.000Z'));
    });

    test('an article that drops out of the feed is kept', async () => {
        server.serve('/shrink.xml', rss([POST_A, POST_B]));

        const url = `${server.url}/shrink.xml`;
        const { feedId } = await ingestFeed(testDb.db, url, { now: T1 });

        server.serve('/shrink.xml', rss([POST_B]));
        await ingestFeed(testDb.db, url, { now: T2 });

        expect([...(await itemsOf(feedId)).keys()].sort()).toEqual(['a', 'b']);
    });

    test('an unchanged re-fetch sends no item rows, and one edit sends exactly one', async () => {
        server.serve('/budget.xml', rss([POST_A, POST_B, POST_C]));

        const url = `${server.url}/budget.xml`;

        await ingestFeed(testDb.db, url, { now: T1 });

        testDb.queries.length = 0;
        await ingestFeed(testDb.db, url, { now: T2 });
        expect(testDb.queries.filter((query) => /^(insert into|update) "items"/.test(query))).toEqual([]);
        expect(testDb.queries).toHaveLength(3);

        server.serve('/budget.xml', rss([POST_A, { ...POST_B, title: 'Post B v2' }, POST_C]));
        testDb.queries.length = 0;
        await ingestFeed(testDb.db, url, { now: T3 });

        const itemInserts = testDb.queries.filter((query) => query.startsWith('insert into "items"'));

        expect(itemInserts).toHaveLength(1);
        expect(itemInserts[0]!.match(/\), \(/g)).toBeNull();
    });
});

describe('304 Not Modified', () => {
    test('counts as a success and leaves items and metadata alone', async () => {
        const url = `${server.url}/cached.xml`;
        const { feedId } = await ingestFeed(testDb.db, url, { now: T1 });
        const itemsBefore = await itemsOf(feedId);

        await testDb.db
            .update(feeds)
            .set({ consecutiveFailures: 2, lastErrorCode: 'timeout', lastErrorMessage: 'slow', title: 'Renamed locally' })
            .where(eq(feeds.id, feedId));

        const result = await ingestFeed(testDb.db, url, { now: T2 });

        expect(server.lastHeaders['/cached.xml']!.get('if-none-match')).toBe(ETAG);
        expect(result).toMatchObject({ feedId, notModified: true, inserted: 0, updated: 0, unchanged: 0 });
        expect(await feedAt(url)).toMatchObject({
            lastFetchedAt: T2,
            lastSuccessAt: T2,
            consecutiveFailures: 0,
            lastErrorCode: null,
            lastErrorMessage: null,
            etag: ETAG,
            lastModified: LAST_MODIFIED,
            title: 'Renamed locally',
        });
        expect(await itemsOf(feedId)).toEqual(itemsBefore);
    });

    test('a 304 for a feed that disappeared during the fetch fails with a clear error, not a TypeError', async () => {
        const url = `${server.url}/cached.xml`;

        await ingestFeed(testDb.db, url, { now: T1 });

        // Another ingest renames or merges the stored row away while this fetch is in flight.
        spyOn(feedsService, 'fetchUpstream').mockImplementation(async () => {
            await testDb.db.delete(feeds).where(eq(feeds.url, url));

            return { notModified: true, finalUrl: url, redirect: null, validators: { etag: null, lastModified: null } };
        });

        const err = await ingestFeed(testDb.db, url, { now: T2 }).then(
            () => null,
            (thrown: unknown) => thrown,
        );

        expect(err).not.toBeInstanceOf(TypeError);
        expect((err as Error).message).toBe(`The feed at ${url} changed while it was being ingested`);
    });

    test('a 304 for a URL with no stored feed is a bad gateway, and nothing is stored', async () => {
        const url = `${server.url}/always-not-modified`;

        const err = await httpErrorFrom(ingestFeed(testDb.db, url, { now: T1 }));

        expect(err.code).toBe('http_5xx');
        expect(err.upstreamStatus).toBe(304);
        expect(await testDb.db.select().from(feeds)).toEqual([]);
    });

    test('a 304 after a permanent redirect moves the stored feed to the new URL and keeps its validators', async () => {
        const oldUrl = `${server.url}/moved-to-cached`;
        const newUrl = `${server.url}/cached.xml`;
        const [old] = await testDb.db.insert(feeds).values({ url: oldUrl, title: 'Old', etag: ETAG, lastModified: LAST_MODIFIED }).returning();

        const result = await ingestFeed(testDb.db, oldUrl, { now: T1 });

        expect(result).toMatchObject({ feedId: old!.id, url: newUrl, movedFrom: oldUrl, mergedFeedId: null, notModified: true });
        expect(await feedAt(oldUrl)).toBeUndefined();
        expect(await feedAt(newUrl)).toMatchObject({ id: old!.id, etag: ETAG, lastModified: LAST_MODIFIED, lastSuccessAt: T1 });
    });

    test("a 304 after a permanent redirect onto a stored feed merges into it and writes the old feed's validators there", async () => {
        const newUrl = `${server.url}/cached.xml`;
        const keep = await ingestFeed(testDb.db, newUrl, { now: T1 });

        await testDb.db.update(feeds).set({ etag: '"target"', lastModified: 'Wed, 01 Jan 2025 00:00:00 GMT' }).where(eq(feeds.id, keep.feedId));

        const oldUrl = `${server.url}/moved-to-cached`;
        const [old] = await testDb.db.insert(feeds).values({ url: oldUrl, title: 'Old', etag: ETAG, lastModified: LAST_MODIFIED }).returning();

        const result = await ingestFeed(testDb.db, oldUrl, { now: T2 });

        expect(result).toMatchObject({ feedId: keep.feedId, url: newUrl, movedFrom: oldUrl, mergedFeedId: old!.id, notModified: true });
        expect(await feedAt(oldUrl)).toBeUndefined();
        expect(await feedAt(newUrl)).toMatchObject({ id: keep.feedId, etag: ETAG, lastModified: LAST_MODIFIED, lastSuccessAt: T2 });
    });
});

describe('failures', () => {
    test('a failed fetch is recorded on the stored feed and rethrown; failures count up', async () => {
        server.serve('/flaky.xml', rss([POST_A]));

        const url = `${server.url}/flaky.xml`;
        const { feedId } = await ingestFeed(testDb.db, url, { now: T1 });
        const before = await feedAt(url);

        server.serve('/flaky.xml', 'boom', { status: 500 });

        const err = await httpErrorFrom(ingestFeed(testDb.db, url, { now: T2 }));

        expect(err.code).toBe('http_5xx');

        const after = await feedAt(url);

        expect(after).toMatchObject({
            lastFetchedAt: T2,
            lastSuccessAt: T1,
            lastErrorCode: 'http_5xx',
            lastErrorStatus: 500,
            consecutiveFailures: 1,
            title: before!.title,
            etag: before!.etag,
        });
        expect(after!.lastErrorMessage).toContain('500');
        expect((await itemsOf(feedId)).size).toBe(1);

        await httpErrorFrom(ingestFeed(testDb.db, url, { now: T3 }));
        expect((await feedAt(url))!.consecutiveFailures).toBe(2);
    });

    test('a success after failures resets the count and clears the error', async () => {
        server.serve('/recovers.xml', rss([POST_A]));

        const url = `${server.url}/recovers.xml`;
        const { feedId } = await ingestFeed(testDb.db, url, { now: T1 });

        await testDb.db
            .update(feeds)
            .set({ consecutiveFailures: 3, lastErrorCode: 'timeout', lastErrorMessage: 'slow', lastErrorStatus: null })
            .where(eq(feeds.id, feedId));

        await ingestFeed(testDb.db, url, { now: T2 });

        expect(await feedAt(url)).toMatchObject({
            consecutiveFailures: 0,
            lastErrorCode: null,
            lastErrorMessage: null,
            lastErrorStatus: null,
            lastSuccessAt: T2,
        });
    });

    // Each case stores a working feed at the path first, then makes the path fail in one way.
    const failures: Array<{ name: string; code: string; status: number | null; fail: (path: string) => void }> = [
        { name: 'a 404', code: 'http_4xx', status: 404, fail: (path) => server.serve(path, 'gone', { status: 404 }) },
        { name: 'a web page', code: 'not_a_feed', status: null, fail: (path) => server.serve(path, '<!doctype html><html><body>Hi</body></html>') },
        { name: 'a body over 5 MB', code: 'too_large', status: null, fail: (path) => server.serve(path, new Uint8Array(6 * 1024 * 1024).fill(32)) },
    ];

    for (const { name, code, status, fail } of failures) {
        test(`${name} is recorded as ${code}`, async () => {
            const path = `/fails-${code}.xml`;

            server.serve(path, rss([POST_A]));

            const url = `${server.url}${path}`;

            await ingestFeed(testDb.db, url, { now: T1 });

            fail(path);
            await httpErrorFrom(ingestFeed(testDb.db, url, { now: T2 }));

            expect(await feedAt(url)).toMatchObject({ lastErrorCode: code, lastErrorStatus: status, consecutiveFailures: 1 });
        });
    }

    test('a timeout is recorded as timeout', async () => {
        const url = `${server.url}/slow`;

        await testDb.db.insert(feeds).values({ url, title: 'Slow feed' });

        const err = await httpErrorFrom(ingestFeed(testDb.db, url, { now: T1 }));

        expect(err.code).toBe('timeout');
        expect(await feedAt(url)).toMatchObject({ lastErrorCode: 'timeout', lastErrorStatus: null, consecutiveFailures: 1, lastFetchedAt: T1 });
    });

    test("a busy host isn't the feed failing: the 429 is rethrown and nothing is recorded", async () => {
        server.serve('/busy-host.xml', rss([POST_A]));

        const url = `${server.url}/busy-host.xml`;

        await ingestFeed(testDb.db, url, { now: T1 });

        const before = await feedAt(url);

        spyOn(feedsService.hostLimiter, 'acquire').mockResolvedValue(null);

        const err = await httpErrorFrom(ingestFeed(testDb.db, url, { now: T2 }));

        expect(err).toMatchObject({ status: 429, code: 'rate_limited', retryAfterSeconds: 5 });
        expect(await feedAt(url)).toEqual(before);
    });

    test('a database error rolls everything back and records nothing', async () => {
        server.serve('/db-error.xml', rss([POST_A]));

        const url = `${server.url}/db-error.xml`;

        await testDb.db.insert(feeds).values({ url, title: 'Before' });
        await testDb.db.execute(sql`create function reject_items() returns trigger language plpgsql as $$ begin raise exception 'items are read-only'; end $$`);
        await testDb.db.execute(sql`create trigger reject_items before insert on items for each row execute function reject_items()`);

        try {
            const err = await ingestFeed(testDb.db, url, { now: T1 }).catch((thrown: unknown) => thrown);

            expect(err).not.toBeInstanceOf(HttpError);
        } finally {
            await testDb.db.execute(sql`drop trigger reject_items on items`);
            await testDb.db.execute(sql`drop function reject_items`);
        }

        expect(await feedAt(url)).toMatchObject({ title: 'Before', lastFetchedAt: null, lastSuccessAt: null, consecutiveFailures: 0, lastErrorCode: null });
    });
});

describe('next fetch time', () => {
    // Checks the feed at `url` is due again about `minutes` after `from`, within the ±10% jitter.
    async function expectNextFetchIn(url: string, from: Date, minutes: number) {
        const feed = await feedAt(url);
        const actualMinutes = (feed!.nextFetchAt.getTime() - from.getTime()) / 60_000;

        expect(actualMinutes).toBeGreaterThanOrEqual(minutes * 0.9);
        expect(actualMinutes).toBeLessThanOrEqual(minutes * 1.1);
    }

    test('a new feed, then a 304, are each fetched again in about 15 minutes (±10%)', async () => {
        const url = `${server.url}/cached.xml`;

        await ingestFeed(testDb.db, url, { now: T1 });

        await expectNextFetchIn(url, T1, 15);

        const second = await ingestFeed(testDb.db, url, { now: T2 });

        expect(second.notModified).toBe(true);
        await expectNextFetchIn(url, T2, 15);
    });

    test('temporary failures back off 30 min, 1 h, 2 h (±10%)', async () => {
        server.serve('/backs-off.xml', rss([POST_A]));

        const url = `${server.url}/backs-off.xml`;

        await ingestFeed(testDb.db, url, { now: T1 });
        server.serve('/backs-off.xml', 'boom', { status: 500 });

        for (const minutes of [30, 60, 120]) {
            await httpErrorFrom(ingestFeed(testDb.db, url, { now: T2 }));
            await expectNextFetchIn(url, T2, minutes);
        }
    });

    test('a permanent failure (410 Gone) waits about 6 hours (±10%)', async () => {
        server.serve('/goes-away.xml', rss([POST_A]));

        const url = `${server.url}/goes-away.xml`;

        await ingestFeed(testDb.db, url, { now: T1 });
        server.serve('/goes-away.xml', 'gone', { status: 410 });
        await httpErrorFrom(ingestFeed(testDb.db, url, { now: T2 }));

        await expectNextFetchIn(url, T2, 6 * 60);
    });
});

describe('redirects', () => {
    test('a permanent redirect moves the stored URL and keeps the feed id', async () => {
        const oldUrl = `${server.url}/moved-permanently`;
        const [old] = await testDb.db.insert(feeds).values({ url: oldUrl, title: 'Old' }).returning();

        const result = await ingestFeed(testDb.db, oldUrl, { now: T1 });

        expect(result).toMatchObject({ feedId: old!.id, url: `${server.url}/feed.xml`, movedFrom: oldUrl, mergedFeedId: null });
        expect(await feedAt(oldUrl)).toBeUndefined();
        expect((await feedAt(`${server.url}/feed.xml`))!.id).toBe(old!.id);
    });

    test('a temporary redirect keeps the stored URL', async () => {
        const url = `${server.url}/moved-temporarily`;

        await testDb.db.insert(feeds).values({ url, title: 'Old' });

        const result = await ingestFeed(testDb.db, url, { now: T1 });

        expect(result).toMatchObject({ url, movedFrom: null });
        expect(await feedAt(url)).toBeDefined();
        expect(await feedAt(`${server.url}/feed.xml`)).toBeUndefined();
    });

    test('a new URL that permanently redirects to a stored feed reuses that feed', async () => {
        const target = await ingestFeed(testDb.db, `${server.url}/feed.xml`, { now: T1 });

        const result = await ingestFeed(testDb.db, `${server.url}/moved-permanently`, { now: T2 });

        expect(result).toMatchObject({ feedId: target.feedId, inserted: 0, movedFrom: null });
        expect(await testDb.db.select({ id: feeds.id }).from(feeds)).toEqual([{ id: target.feedId }]);
    });

    test('a permanent redirect onto a stored feed merges the old feed into it', async () => {
        const keep = await ingestFeed(testDb.db, `${server.url}/feed.xml`, { now: T1 });
        const sharedGuid = [...(await itemsOf(keep.feedId)).keys()][0]!;
        const keptItem = (await itemsOf(keep.feedId)).get(sharedGuid)!;

        const oldUrl = `${server.url}/moved-permanently`;
        const [old] = await testDb.db.insert(feeds).values({ url: oldUrl, title: 'Old copy' }).returning();
        const oldItem = { feedId: old!.id, summary: '', contentHtml: '', hasFullContent: false, contentHash: 'old' };
        const [duplicate] = await testDb.db
            .insert(items)
            .values({ ...oldItem, guid: sharedGuid, title: 'Same article, old feed' })
            .returning();
        const [onlyOld] = await testDb.db
            .insert(items)
            .values({ ...oldItem, guid: 'only-in-old-feed', title: 'Old-only article' })
            .returning();

        const both = await newUser(testDb.db);
        const oldOnly = await newUser(testDb.db);

        await testDb.db.insert(subscriptions).values([
            { userId: both, feedId: keep.feedId, customTitle: 'Kept' },
            { userId: both, feedId: old!.id, customTitle: 'Dropped' },
            { userId: oldOnly, feedId: old!.id },
        ]);
        await testDb.db.insert(bookmarks).values({ userId: oldOnly, itemId: duplicate!.id });
        await testDb.db.insert(itemReadStates).values({ userId: oldOnly, itemId: duplicate!.id, isRead: true });

        const result = await ingestFeed(testDb.db, oldUrl, { now: T2 });

        expect(result).toMatchObject({ feedId: keep.feedId, movedFrom: oldUrl, mergedFeedId: old!.id });
        expect(await testDb.db.select().from(feeds).where(eq(feeds.id, old!.id))).toEqual([]);

        const merged = await itemsOf(keep.feedId);

        expect(merged.get(sharedGuid)!.id).toBe(keptItem.id);
        expect(merged.get('only-in-old-feed')!.id).toBe(onlyOld!.id);

        expect(await testDb.db.select({ itemId: bookmarks.itemId }).from(bookmarks)).toEqual([{ itemId: keptItem.id }]);
        expect(await testDb.db.select({ itemId: itemReadStates.itemId }).from(itemReadStates)).toEqual([{ itemId: keptItem.id }]);

        const subs = await testDb.db
            .select({ userId: subscriptions.userId, feedId: subscriptions.feedId, customTitle: subscriptions.customTitle })
            .from(subscriptions);

        expect(subs).toHaveLength(2);
        expect(subs).toContainEqual({ userId: both, feedId: keep.feedId, customTitle: 'Kept' });
        expect(subs).toContainEqual({ userId: oldOnly, feedId: keep.feedId, customTitle: null });
    });

    test('a merge keeps one bookmark and one read state when a reader has them on both copies of an item', async () => {
        const keep = await ingestFeed(testDb.db, `${server.url}/feed.xml`, { now: T1 });
        const sharedGuid = [...(await itemsOf(keep.feedId)).keys()][0]!;
        const keptItem = (await itemsOf(keep.feedId)).get(sharedGuid)!;

        const oldUrl = `${server.url}/moved-permanently`;
        const [old] = await testDb.db.insert(feeds).values({ url: oldUrl, title: 'Old copy' }).returning();
        const [duplicate] = await testDb.db
            .insert(items)
            .values({ feedId: old!.id, guid: sharedGuid, title: 'Old copy', summary: '', contentHtml: '', hasFullContent: false, contentHash: 'old' })
            .returning();

        const reader = await newUser(testDb.db);

        await testDb.db.insert(bookmarks).values([
            { userId: reader, itemId: keptItem.id },
            { userId: reader, itemId: duplicate!.id },
        ]);
        await testDb.db.insert(itemReadStates).values([
            { userId: reader, itemId: keptItem.id, isRead: false },
            { userId: reader, itemId: duplicate!.id, isRead: true },
        ]);

        await ingestFeed(testDb.db, oldUrl, { now: T2 });

        expect(await testDb.db.select({ itemId: bookmarks.itemId }).from(bookmarks)).toEqual([{ itemId: keptItem.id }]);
        expect(await testDb.db.select({ itemId: itemReadStates.itemId, isRead: itemReadStates.isRead }).from(itemReadStates)).toEqual([
            { itemId: keptItem.id, isRead: false },
        ]);
    });

    test("a merge moves the old feed's starter entry to the kept feed, unless the kept feed has its own", async () => {
        const keep = await ingestFeed(testDb.db, `${server.url}/feed.xml`, { now: T1 });
        const oldUrl = `${server.url}/moved-permanently`;
        const [old] = await testDb.db.insert(feeds).values({ url: oldUrl, title: 'Old copy' }).returning();

        await testDb.db.insert(starterFeeds).values({ feedId: old!.id, categoryName: 'Frontend', position: 3 });
        await ingestFeed(testDb.db, oldUrl, { now: T2 });

        expect(await testDb.db.select().from(starterFeeds)).toEqual([{ feedId: keep.feedId, categoryName: 'Frontend', position: 3 }]);

        const [secondOld] = await testDb.db.insert(feeds).values({ url: oldUrl, title: 'Old copy again' }).returning();

        await testDb.db.insert(starterFeeds).values({ feedId: secondOld!.id, categoryName: 'Design', position: 7 });
        await ingestFeed(testDb.db, oldUrl, { now: T3 });

        expect(await testDb.db.select().from(starterFeeds)).toEqual([{ feedId: keep.feedId, categoryName: 'Frontend', position: 3 }]);
    });
});

describe('odd feeds', () => {
    // Stores a fixture from test/fixtures/feeds/ and returns the result with the stored items.
    async function ingestFixture(path: string) {
        server.serve(`/${path}`, readFixture(path));

        const result = await ingestFeed(testDb.db, `${server.url}/${path}`, { now: T1 });

        return { result, stored: await itemsOf(result.feedId) };
    }

    test('duplicate guids are stored once', async () => {
        const { result, stored } = await ingestFixture('odd/duplicate-guids.xml');

        expect(stored.size).toBe(result.inserted);
        expect(result.warnings.join(' ')).toContain('duplicate');
    });

    test('an item with missing fields is stored with fallbacks', async () => {
        const { stored } = await ingestFixture('odd/missing-fields.xml');

        expect(stored.size).toBeGreaterThan(0);
        expect([...stored.values()].every((item) => item.title.length > 0)).toBe(true);
    });

    test('an empty channel stores the feed with no items and no latest_item_at', async () => {
        const { result, stored } = await ingestFixture('odd/empty-channel.xml');

        expect(stored.size).toBe(0);
        expect(result.warnings).toContain('The feed has no items');
        expect((await feedAt(`${server.url}/odd/empty-channel.xml`))!.latestItemAt).toBeNull();
    });

    test('undated items sort by when they were first seen', async () => {
        const { stored } = await ingestFixture('odd/atom-no-dates.xml');

        const undated = [...stored.values()].filter((item) => item.publishedAt === null);

        expect(undated.length).toBeGreaterThan(0);
        expect(undated.every((item) => item.sortAt.getTime() === T1.getTime())).toBe(true);
    });

    test('scripts and event handlers never reach the database', async () => {
        const { stored } = await ingestFixture('odd/xss.xml');

        for (const item of stored.values())
            expect(item.contentHtml).not.toMatch(/<script|\son\w+=/i);
    });

    test('a truncated feed is stored with a warning', async () => {
        const { result, stored } = await ingestFixture('odd/malformed-unclosed.xml');

        expect(stored.size).toBeGreaterThan(0);
        expect(result.warnings.join(' ')).toContain('parsed partially');
    });
});
