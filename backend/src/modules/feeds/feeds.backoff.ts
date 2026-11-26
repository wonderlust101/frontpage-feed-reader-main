// When to fetch a feed next. After a success: the refresh interval. After a failure: exponential backoff that starts
// later for permanent errors (4xx, not a feed) than for temporary ones (5xx, timeout), never past a day. ±10% spreads feeds out.

import { env } from '../../env';

export type FetchFailure = {
    // Failures in a row, this one included.
    failures: number;
    retryable: boolean;
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const REFRESH_INTERVAL_MS = env.FEED_MIN_REFETCH_MINUTES * MINUTE_MS;
const PERMANENT_FIRST_DELAY_MS = 6 * HOUR_MS;
const MAX_DELAY_MS = 24 * HOUR_MS;
const JITTER = 0.1;
// 2^10 steps is already far past the cap; the limit stops a huge failure count from overflowing.
const MAX_DOUBLINGS = 10;

// `random` returns a number in [0, 1) like Math.random; tests pass a fixed one.
export function nextFetchAt(now: Date, failure?: FetchFailure, random: () => number = Math.random): Date {
    const jitter = 1 - JITTER + 2 * JITTER * random();
    const delayMs = Math.min(MAX_DELAY_MS, baseDelayMs(failure) * jitter);

    return new Date(now.getTime() + delayMs);
}

// Temporary failures: 30 min, 1 h, 2 h… Permanent ones: 6 h, 12 h, 24 h.
function baseDelayMs(failure: FetchFailure | undefined): number {
    if (!failure)
        return REFRESH_INTERVAL_MS;

    if (failure.retryable)
        return REFRESH_INTERVAL_MS * 2 ** Math.min(failure.failures, MAX_DOUBLINGS);

    return PERMANENT_FIRST_DELAY_MS * 2 ** Math.min(failure.failures - 1, MAX_DOUBLINGS);
}
