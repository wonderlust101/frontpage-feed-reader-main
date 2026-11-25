// The background refresh against an in-memory Postgres (PGlite) and the fake feed server, with a fixed clock: which feeds a
// burst picks, backoff, 304s, isolation of slow and broken feeds, claims, and starting and stopping the scheduler.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { feeds, items, starterFeeds, subscriptions } from '../../../src/db/schema';
import * as feedsIngest from '../../../src/modules/feeds/feeds.ingest';
import { refreshDueFeeds, startFeedScheduler } from '../../../src/modules/feeds/feeds.scheduler';
import { hostLimiter } from '../../../src/modules/feeds/feeds.service';
import { ETAG, startFeedServer } from '../../helpers/feed-server';
import { newFeed, newUser } from '../../helpers/factories';
import { createTestDb } from '../../helpers/test-db';

const T1 = new Date('2026-02-01T10:00:00.000Z');
const MINUTE_MS = 60 * 1000;
const WINDOW_MS = 15 * MINUTE_MS;
const NOTHING = { fetched: 0, notModified: 0, failed: 0, deferred: 0, crashed: 0 };

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
    // Burst summaries and per-feed failures are logged; tests that care spy on them again.
    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    mock.restore();
});

// A feed at `path` on the fake server that one reader follows, due at `nextFetchAt` (a minute before T1 by default).
async function followedFeed(path: string, nextFetchAt = new Date(T1.getTime() - MINUTE_MS)): Promise<string> {
    const feedId = await newFeed(testDb.db, { url: `${server.url}${path}`, nextFetchAt });
    const userId = await newUser(testDb.db);

    await testDb.db.insert(subscriptions).values({ userId, feedId });

    return feedId;
}

// One burst at `now` with the usual 15-minute window.
function refreshAt(now: Date, options: { concurrency?: number } = {}) {
    return refreshDueFeeds(testDb.db, { dueWithinMs: WINDOW_MS, clock: () => now, ...options });
}

async function feedRow(feedId: string) {
    const [row] = await testDb.db.select().from(feeds).where(eq(feeds.id, feedId));

    return row!;
}

// Minutes from `from` to the feed's next_fetch_at.
async function minutesUntilNextFetch(feedId: string, from: Date): Promise<number> {
    return ((await feedRow(feedId)).nextFetchAt.getTime() - from.getTime()) / MINUTE_MS;
}

describe('which feeds a burst refreshes', () => {
    test('a followed feed that is due: stored, and due again in about 15 minutes', async () => {
        const feedId = await followedFeed('/feed.xml');

        expect(await refreshAt(T1)).toEqual({ ...NOTHING, fetched: 1 });

        const row = await feedRow(feedId);

        expect(row).toMatchObject({ lastSuccessAt: T1, consecutiveFailures: 0, title: 'CDATA & Title' });
        expect(await minutesUntilNextFetch(feedId, T1)).toBeWithin(13.5, 16.51);
        expect((await testDb.db.select().from(items).where(eq(items.feedId, feedId))).length).toBeGreaterThan(0);
    });

    test('an orphan feed (nobody follows it, not a starter feed) is left alone; a starter feed nobody follows is refreshed', async () => {
        server.serve('/orphan.xml', 'never fetched');
        server.serve('/starter.xml', '<rss version="2.0"><channel><title>Starter</title></channel></rss>');

        const before = { orphan: server.hits['/orphan.xml'] ?? 0, starter: server.hits['/starter.xml'] ?? 0 };

        await newFeed(testDb.db, { url: `${server.url}/orphan.xml`, nextFetchAt: T1 });

        const starterId = await newFeed(testDb.db, { url: `${server.url}/starter.xml`, nextFetchAt: T1 });

        await testDb.db.insert(starterFeeds).values({ feedId: starterId, categoryName: 'Design', position: 0 });

        expect(await refreshAt(T1)).toEqual({ ...NOTHING, fetched: 1 });
        expect(server.hits['/orphan.xml'] ?? 0).toBe(before.orphan);
        expect(server.hits['/starter.xml'] ?? 0).toBe(before.starter + 1);
    });

    test('a feed due within the window is refreshed a little early; one due after it waits for a later burst', async () => {
        const soon = await followedFeed('/feed.xml', new Date(T1.getTime() + 10 * MINUTE_MS));
        const later = await followedFeed('/cached.xml', new Date(T1.getTime() + 20 * MINUTE_MS));

        expect(await refreshAt(T1)).toEqual({ ...NOTHING, fetched: 1 });
        expect((await feedRow(soon)).lastFetchedAt).toEqual(T1);
        expect((await feedRow(later)).lastFetchedAt).toBeNull();
    });

    test('a burst refreshes each feed once, even when its next fetch lands inside the window', async () => {
        // The lowest jitter: due again in 13.5 minutes, inside this burst's 15-minute window.
        spyOn(Math, 'random').mockReturnValue(0);

        const feedId = await followedFeed('/feed.xml');

        expect(await refreshAt(T1)).toEqual({ ...NOTHING, fetched: 1 });
        expect(await minutesUntilNextFetch(feedId, T1)).toBe(13.5);
    });

    test('nothing due → an empty summary and no fetches', async () => {
        await followedFeed('/feed.xml', new Date(T1.getTime() + 60 * MINUTE_MS));

        expect(await refreshAt(T1)).toEqual(NOTHING);
    });
});

describe('refreshing', () => {
    test('an unchanged feed is asked "has it changed?" and answers 304', async () => {
        const feedId = await followedFeed('/cached.xml');

        await refreshAt(T1);

        const T2 = new Date(T1.getTime() + 30 * MINUTE_MS);

        expect(await refreshAt(T2)).toEqual({ ...NOTHING, notModified: 1 });
        expect(server.lastHeaders['/cached.xml']?.get('if-none-match')).toBe(ETAG);
        expect(await feedRow(feedId)).toMatchObject({ lastSuccessAt: T2, consecutiveFailures: 0 });
    });

    test('a failing feed backs off; once it works again the count resets and the 15-minute interval is back', async () => {
        const warn = spyOn(console, 'warn').mockImplementation(() => {});
        const feedId = await followedFeed('/flaky.xml');

        server.serve('/flaky.xml', 'boom', { status: 500 });

        expect(await refreshAt(T1)).toEqual({ ...NOTHING, failed: 1 });
        expect(await feedRow(feedId)).toMatchObject({ consecutiveFailures: 1, lastErrorCode: 'http_5xx' });
        expect(await minutesUntilNextFetch(feedId, T1)).toBeWithin(27, 33.01);
        // The log names the feed and its host, never the full URL (it can carry a private token).
        expect(warn).toHaveBeenCalledWith(`Feed refresh: feed ${feedId} (127.0.0.1) failed: http_5xx`);

        server.serve('/flaky.xml', '<rss version="2.0"><channel><title>Back</title></channel></rss>');

        const T2 = new Date(T1.getTime() + 40 * MINUTE_MS);

        expect(await refreshAt(T2)).toEqual({ ...NOTHING, fetched: 1 });
        expect(await feedRow(feedId)).toMatchObject({ consecutiveFailures: 0, lastErrorCode: null, title: 'Back' });
        expect(await minutesUntilNextFetch(feedId, T2)).toBeWithin(13.5, 16.51);
    });

    test("slow feeds don't hold up the rest: two timeouts cost one timeout's wait, not two", async () => {
        const slow = [await followedFeed('/slow'), await followedFeed('/slow-body')];
        const fast = [await followedFeed('/feed.xml'), await followedFeed('/cached.xml'), await followedFeed('/gzip')];
        const startedAt = Date.now();

        expect(await refreshAt(T1, { concurrency: 3 })).toEqual({ ...NOTHING, fetched: 3, failed: 2 });
        // Each slow feed times out after FEED_FETCH_TIMEOUT_MS (500 ms in tests); one after the other would take over 1 s.
        expect(Date.now() - startedAt).toBeLessThan(950);

        for (const feedId of fast)
            expect((await feedRow(feedId)).lastSuccessAt).toEqual(T1);

        for (const feedId of slow)
            expect((await feedRow(feedId)).lastErrorCode).toBe('timeout');
    });

    test('a busy host defers the feed: nothing is recorded, and its claim brings it back next burst', async () => {
        const feedId = await followedFeed('/feed.xml');

        spyOn(hostLimiter, 'acquire').mockResolvedValue(null);

        expect(await refreshAt(T1)).toEqual({ ...NOTHING, deferred: 1 });
        expect(await feedRow(feedId)).toMatchObject({ lastFetchedAt: null, consecutiveFailures: 0, lastErrorCode: null });
        // Claimed until just past this burst's window, so the next burst (15 minutes on, looking 15 ahead) takes it again.
        expect(await minutesUntilNextFetch(feedId, T1)).toBe(17);
    });

    test('a feed that crashes (not a feed error) is logged and the burst goes on', async () => {
        const logged = spyOn(console, 'error').mockImplementation(() => {});
        const crashing = await followedFeed('/crash.xml');

        await followedFeed('/feed.xml');

        const realIngest = feedsIngest.ingestFeed;

        spyOn(feedsIngest, 'ingestFeed').mockImplementation(async (db, url, options) => {
            if (url.endsWith('/crash.xml'))
                throw new Error('unexpected bug');

            return realIngest(db, url, options);
        });

        expect(await refreshAt(T1)).toEqual({ ...NOTHING, fetched: 1, crashed: 1 });
        expect(logged).toHaveBeenCalledWith(`Feed refresh: feed ${crashing} (127.0.0.1) crashed:`, 'unexpected bug');
    });
});

describe('claims', () => {
    test('two bursts running at once fetch each due feed exactly once', async () => {
        const paths = ['/a.xml', '/b.xml', '/c.xml', '/d.xml', '/e.xml', '/f.xml'];

        for (const path of paths) {
            server.serve(path, `<rss version="2.0"><channel><title>${path}</title></channel></rss>`);
            await followedFeed(path);
        }

        const before = paths.map((path) => server.hits[path] ?? 0);
        const [first, second] = await Promise.all([refreshAt(T1), refreshAt(T1)]);

        expect(first.fetched + second.fetched).toBe(paths.length);
        expect(paths.map((path, i) => (server.hits[path] ?? 0) - before[i]!)).toEqual(paths.map(() => 1));
    });

    test('when claiming fails (database down), the burst logs it once and returns', async () => {
        const logged = spyOn(console, 'error').mockImplementation(() => {});
        const closedDb = await createTestDb();

        await closedDb.close();

        expect(await refreshDueFeeds(closedDb.db, { dueWithinMs: WINDOW_MS, clock: () => T1 })).toEqual(NOTHING);
        expect(logged).toHaveBeenCalledTimes(1);
        expect(logged.mock.calls[0]?.[0]).toBe('Feed refresh: claiming due feeds failed:');
    });
});

describe('startFeedScheduler', () => {
    test('runs a burst at once, and the next one tickMs after it ends', async () => {
        const first = await followedFeed('/feed.xml', new Date());
        const scheduler = startFeedScheduler(testDb.db, { tickMs: 30 });

        try {
            await waitFor(async () => (await feedRow(first)).lastSuccessAt !== null);

            const second = await followedFeed('/cached.xml', new Date());

            await waitFor(async () => (await feedRow(second)).lastSuccessAt !== null);
        } finally {
            await scheduler.stop();
        }
    });

    test('stop() waits for the burst in progress, and no burst starts after it', async () => {
        const slow = await followedFeed('/slow', new Date());
        const scheduler = startFeedScheduler(testDb.db, { tickMs: 20 });

        // The burst is fetching /slow, which only fails when the 500 ms test timeout passes.
        await waitFor(() => (server.hits['/slow'] ?? 0) > 0);
        await scheduler.stop();

        expect((await feedRow(slow)).lastErrorCode).toBe('timeout');

        const hitsAfterStop = server.hits['/feed.xml'] ?? 0;

        await followedFeed('/feed.xml', new Date());
        await Bun.sleep(100);

        expect(server.hits['/feed.xml'] ?? 0).toBe(hitsAfterStop);
    });
});

// Polls `condition` every 10 ms until it holds; fails the test after 2 s.
async function waitFor(condition: () => boolean | Promise<boolean>) {
    const deadline = Date.now() + 2_000;

    while (!(await condition())) {
        if (Date.now() > deadline)
            throw new Error('Timed out waiting for the condition');

        await Bun.sleep(10);
    }
}
