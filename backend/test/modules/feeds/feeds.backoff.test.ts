// nextFetchAt: the interval after a success, both backoff ladders, the 24-hour cap and the ±10% jitter.
// `random` = 0.5 means no jitter, so most tests compare exact delays.

import { describe, expect, test } from 'bun:test';
import { nextFetchAt } from '../../../src/modules/feeds/feeds.backoff';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const NO_JITTER = () => 0.5;

// The delay nextFetchAt picks, in milliseconds.
function delayMs(failure?: { failures: number; retryable: boolean }, random = NO_JITTER): number {
    return nextFetchAt(NOW, failure, random).getTime() - NOW.getTime();
}

describe('nextFetchAt', () => {
    test('after a success: the 15-minute refresh interval', () => {
        expect(delayMs()).toBe(15 * MINUTE_MS);
    });

    test.each([
        [1, '30 min', 30 * MINUTE_MS],
        [2, '1 h', HOUR_MS],
        [3, '2 h', 2 * HOUR_MS],
        [4, '4 h', 4 * HOUR_MS],
        [5, '8 h', 8 * HOUR_MS],
        [6, '16 h', 16 * HOUR_MS],
        [7, '24 h (the cap)', 24 * HOUR_MS],
    ])('temporary failure #%i waits %s', (failures, _label, expected) => {
        expect(delayMs({ failures, retryable: true })).toBe(expected);
    });

    test.each([
        [1, '6 h', 6 * HOUR_MS],
        [2, '12 h', 12 * HOUR_MS],
        [3, '24 h', 24 * HOUR_MS],
        [4, '24 h (the cap)', 24 * HOUR_MS],
    ])('permanent failure #%i waits %s', (failures, _label, expected) => {
        expect(delayMs({ failures, retryable: false })).toBe(expected);
    });

    test('a huge failure count still waits exactly the 24-hour cap', () => {
        expect(delayMs({ failures: 1_000, retryable: true })).toBe(24 * HOUR_MS);
        expect(delayMs({ failures: 1_000, retryable: false })).toBe(24 * HOUR_MS);
    });

    test('jitter moves the delay by at most 10% either way', () => {
        expect(delayMs(undefined, () => 0)).toBe(13.5 * MINUTE_MS);
        expect(delayMs(undefined, () => 0.999_999)).toBeCloseTo(16.5 * MINUTE_MS, -2);
        expect(delayMs({ failures: 1, retryable: false }, () => 0)).toBe(5.4 * HOUR_MS);
    });

    test('jitter never pushes a delay past the cap', () => {
        expect(delayMs({ failures: 7, retryable: true }, () => 0.999_999)).toBe(24 * HOUR_MS);
    });
});
