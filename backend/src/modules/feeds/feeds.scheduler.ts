// Refreshes stored feeds in the background: every FEED_REFRESH_TICK_MINUTES, a burst refreshes each followed or starter feed
// due before the next burst, 5 at a time. Between bursts nothing touches the database, so Neon can scale to zero.

import { and, asc, eq, exists, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { env } from '../../env';
import { HttpError, TooManyRequestsError } from '../../errors';
import { errorMessage } from '../../lib/error-code';
import { subscriptions } from '../subscriptions/subscriptions.schema';
import { ingestFeed } from './feeds.ingest';
import { feeds, starterFeeds } from './feeds.schema';

export type FeedScheduler = {
    // Stops claiming feeds and resolves once the burst in progress has finished.
    stop: () => Promise<void>;
};

export type RefreshSummary = Record<RefreshOutcome, number>;

type RefreshOutcome = 'fetched' | 'notModified' | 'failed' | 'deferred' | 'crashed';

type RefreshOptions = {
    // Refresh every feed due before now + dueWithinMs: the time until the next burst.
    dueWithinMs: number;
    clock?: () => Date;
    concurrency?: number;
    isStopping?: () => boolean;
};

type ClaimedFeed = {
    id: string;
    url: string;
};

// What every claim of one burst shares.
type BurstWindow = {
    startedAt: Date;
    dueBy: Date;
};

const MINUTE_MS = 60 * 1000;
const CONCURRENCY = 5;
// A claimed feed stays out of reach this long past the burst's window: far longer than one ingest takes.
const CLAIM_MS = 2 * MINUTE_MS;

// Runs a burst now, then the next one tickMs after each burst ends, so two bursts never overlap.
export function startFeedScheduler(db: Database, { tickMs = env.FEED_REFRESH_TICK_MINUTES * MINUTE_MS } = {}): FeedScheduler {
    let stopping = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let burst = runBurst();

    async function runBurst() {
        const startedAt = Date.now();
        const summary = await refreshDueFeeds(db, { dueWithinMs: tickMs, isStopping: () => stopping });

        logSummary(summary, Date.now() - startedAt);

        if (!stopping) {
            timer = setTimeout(() => {
                burst = runBurst();
            }, tickMs);
        }
    }

    return {
        stop: async () => {
            stopping = true;
            clearTimeout(timer);
            await burst;
        },
    };
}

// One burst: workers claim and ingest due feeds until none are left, each feed at most once. Never throws: a feed's failure
// is counted (ingestFeed stores it on the feed), and a failed claim (database down) ends the burst with a log line.
export async function refreshDueFeeds(db: Database, options: RefreshOptions): Promise<RefreshSummary> {
    const { dueWithinMs, clock = () => new Date(), concurrency = CONCURRENCY, isStopping = () => false } = options;
    const startedAt = clock();
    const burst: BurstWindow = { startedAt, dueBy: new Date(startedAt.getTime() + dueWithinMs) };
    const summary: RefreshSummary = { fetched: 0, notModified: 0, failed: 0, deferred: 0, crashed: 0 };

    async function work() {
        while (!isStopping()) {
            const feed = await claimDueFeed(db, burst);

            if (!feed)
                return;

            summary[await refreshFeed(db, feed, clock())]++;
        }
    }

    const workers = await Promise.allSettled(Array.from({ length: concurrency }, work));
    const claimFailure = workers.find((worker) => worker.status === 'rejected');

    if (claimFailure)
        console.error('Feed refresh: claiming due feeds failed:', errorMessage(claimFailure.reason));

    return summary;
}

// Takes the most overdue feed that someone follows (or that guests see) and moves its next_fetch_at past this burst's
// window, in one statement. SKIP LOCKED lets a second server claiming at the same time take a different feed.
async function claimDueFeed(db: Database, { startedAt, dueBy }: BurstWindow): Promise<ClaimedFeed | undefined> {
    const isFollowed = exists(db.select({ one: sql`1` }).from(subscriptions).where(eq(subscriptions.feedId, feeds.id)));
    const isStarter = exists(db.select({ one: sql`1` }).from(starterFeeds).where(eq(starterFeeds.feedId, feeds.id)));
    // A feed fetched in this burst can be due again inside its window (15 min minus jitter); it waits for the next burst.
    const notFetchedThisBurst = or(isNull(feeds.lastFetchedAt), lt(feeds.lastFetchedAt, startedAt));
    const mostOverdue = db
        .select({ id: feeds.id })
        .from(feeds)
        .where(and(lte(feeds.nextFetchAt, dueBy), notFetchedThisBurst, or(isFollowed, isStarter)))
        .orderBy(asc(feeds.nextFetchAt))
        .limit(1)
        .for('update', { skipLocked: true });

    const [claimed] = await db
        .update(feeds)
        .set({ nextFetchAt: new Date(dueBy.getTime() + CLAIM_MS) })
        .where(inArray(feeds.id, mostOverdue))
        .returning({ id: feeds.id, url: feeds.url });

    return claimed;
}

// A routine failure (it repeats daily for a dead feed) logs the host, never the full URL, which can carry a private token.
// A crash is a bug, so it is logged in full, like errorHandler does for unexpected errors.
async function refreshFeed(db: Database, feed: ClaimedFeed, now: Date): Promise<RefreshOutcome> {
    try {
        const result = await ingestFeed(db, feed.url, { now });

        return result.notModified ? 'notModified' : 'fetched';
    } catch (err) {
        // Our own per-host limit, not the feed: its claim brings it back next burst.
        if (err instanceof TooManyRequestsError)
            return 'deferred';

        const host = new URL(feed.url).hostname;

        if (err instanceof HttpError) {
            console.warn(`Feed refresh: feed ${feed.id} (${host}) failed: ${err.code}`);

            return 'failed';
        }

        console.error(`Feed refresh: feed ${feed.id} (${host}) crashed:`, errorMessage(err));

        return 'crashed';
    }
}

// One line per burst that found work; quiet bursts log nothing.
function logSummary(summary: RefreshSummary, durationMs: number) {
    const total = Object.values(summary).reduce((sum, count) => sum + count, 0);

    if (total === 0)
        return;

    const { fetched, notModified, failed, deferred, crashed } = summary;

    console.log(
        `Feed refresh: ${total} checked in ${(durationMs / 1000).toFixed(1)}s (${fetched} updated, ${notModified} unchanged, ` +
            `${failed} failed, ${deferred} deferred, ${crashed} crashed)`,
    );
}
