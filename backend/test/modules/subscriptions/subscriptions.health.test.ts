// deriveHealth's rule and its boundaries: dead → error → stale → active, first match wins.

import { describe, expect, test } from 'bun:test';
import type { FeedErrorCode, FeedHealth } from '@frontpage/shared';
import { deriveHealth } from '../../../src/modules/subscriptions/subscriptions.health';

type Feed = Parameters<typeof deriveHealth>[0];

const NOW = new Date('2026-06-01T12:00:00.000Z');

// The date `days` days before NOW.
function daysAgo(days: number): Date {
    return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

// A feed that fetched fine today, stored a year ago, with a new item yesterday; `changes` override any field.
function feed(changes: Partial<Feed> = {}): Feed {
    return {
        lastErrorCode: null,
        lastSuccessAt: NOW,
        consecutiveFailures: 0,
        latestItemAt: daysAgo(1),
        createdAt: daysAgo(365),
        ...changes,
    };
}

// A feed whose last `failures` fetches failed, the last success `daysSinceSuccess` days ago (null = never).
function failing(failures: number, daysSinceSuccess: number | null, code: FeedErrorCode = 'http_5xx'): Feed {
    return feed({
        lastErrorCode: code,
        consecutiveFailures: failures,
        lastSuccessAt: daysSinceSuccess === null ? null : daysAgo(daysSinceSuccess),
    });
}

describe('deriveHealth', () => {
    test.each<[string, Feed, FeedHealth]>([
        ['fetched fine with a new item yesterday', feed(), 'active'],
        ['newest item exactly 30 days old', feed({ latestItemAt: daysAgo(30) }), 'stale'],
        ['newest item 29 days old', feed({ latestItemAt: daysAgo(29) }), 'active'],
        ['no items, stored 30 days ago', feed({ latestItemAt: null, createdAt: daysAgo(30) }), 'stale'],
        ['no items, stored 29 days ago', feed({ latestItemAt: null, createdAt: daysAgo(29) }), 'active'],
        ['last fetch failed once', failing(1, 0), 'error'],
        ['4 failures, last success 30 days ago', failing(4, 30), 'error'],
        ['5 failures, last success 6 days ago', failing(5, 6), 'error'],
        ['5 failures, last success exactly 7 days ago', failing(5, 7), 'dead'],
        ['permanent 404 for weeks', failing(40, 60, 'http_4xx'), 'dead'],
        ['5 failures and no success on record', failing(5, null), 'dead'],
        ['1 failure and no success on record', failing(1, null), 'error'],
    ])('%s → %s', (_name, input, expected) => {
        expect(deriveHealth(input, NOW)).toBe(expected);
    });

    test('a failing feed is error, not stale, even when its newest item is old', () => {
        expect(deriveHealth({ ...failing(1, 0), latestItemAt: daysAgo(90) }, NOW)).toBe('error');
    });

    test('a working feed that publishes rarely is stale, never dead', () => {
        expect(deriveHealth(feed({ latestItemAt: daysAgo(400) }), NOW)).toBe('stale');
    });
});
