// A feed's health, worked out from its fetch columns on every read (never stored). The first match wins:
// dead (keeps failing and no success for a week) → error (last fetch failed) → stale (no new item for 30 days) → active.
// A feed that publishes rarely but fetches fine is stale, never dead: only failures make a feed dead.

import type { FeedHealth } from '@frontpage/shared';
import type { feeds } from '../feeds/feeds.schema';

type FeedHealthInput = Pick<typeof feeds.$inferSelect, 'lastErrorCode' | 'lastSuccessAt' | 'consecutiveFailures' | 'latestItemAt' | 'createdAt'>;

const DAY_MS = 24 * 60 * 60 * 1000;
const DEAD_MIN_FAILURES = 5;
const DEAD_MIN_DAYS = 7;
const STALE_DAYS = 30;

// The feed's health at `now`, e.g. 'stale' for a working feed whose newest item is 40 days old.
// A feed with no items counts from when it was first stored; a missing last success counts as infinitely long ago.
export function deriveHealth(feed: FeedHealthInput, now: Date): FeedHealth {
    if (feed.lastErrorCode) {
        const msSinceSuccess = feed.lastSuccessAt ? now.getTime() - feed.lastSuccessAt.getTime() : Infinity;
        const isDead = feed.consecutiveFailures >= DEAD_MIN_FAILURES && msSinceSuccess >= DEAD_MIN_DAYS * DAY_MS;

        return isDead ? 'dead' : 'error';
    }

    const lastNewItemAt = feed.latestItemAt ?? feed.createdAt;

    return now.getTime() - lastNewItemAt.getTime() >= STALE_DAYS * DAY_MS ? 'stale' : 'active';
}
