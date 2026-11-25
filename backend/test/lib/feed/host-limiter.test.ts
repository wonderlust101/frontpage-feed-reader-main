// createHostLimiter with real but tiny waits: the per-host cap, the gap between starts (also after the host goes idle),
// hosts not blocking each other, giving up after the wait, and releasing twice.

import { describe, expect, test } from 'bun:test';
import { createHostLimiter } from '../../../src/lib/feed/host-limiter';

describe('createHostLimiter', () => {
    test('allows up to maxConcurrent fetches per host, then makes the next one wait', async () => {
        const limiter = createHostLimiter({ maxConcurrent: 2, minIntervalMs: 0 });
        const first = await limiter.acquire('a.test', 0);
        const second = await limiter.acquire('a.test', 0);

        expect(first).toBeFunction();
        expect(second).toBeFunction();
        expect(await limiter.acquire('a.test', 0)).toBeNull();

        first!();

        expect(await limiter.acquire('a.test', 0)).toBeFunction();
    });

    test('a waiting caller gets the slot as soon as one is released', async () => {
        const limiter = createHostLimiter({ maxConcurrent: 1, minIntervalMs: 0 });
        const release = await limiter.acquire('a.test', 0);
        const waiting = limiter.acquire('a.test', 1_000);

        setTimeout(() => release!(), 20);

        expect(await waiting).toBeFunction();
    });

    test('starts fetches to one host at least minIntervalMs apart', async () => {
        const limiter = createHostLimiter({ maxConcurrent: 5, minIntervalMs: 60 });
        const startedAt = Date.now();

        await limiter.acquire('a.test', 0);

        expect(await limiter.acquire('a.test', 0)).toBeNull();
        expect(await limiter.acquire('a.test', 500)).toBeFunction();
        // Timers can fire a millisecond early.
        expect(Date.now() - startedAt).toBeGreaterThanOrEqual(59);
    });

    test("one host's limit doesn't hold up another host", async () => {
        const limiter = createHostLimiter({ maxConcurrent: 1, minIntervalMs: 10_000 });

        expect(await limiter.acquire('a.test', 0)).toBeFunction();
        expect(await limiter.acquire('b.test', 0)).toBeFunction();
    });

    test('gives up with null once maxWaitMs has passed', async () => {
        const limiter = createHostLimiter({ maxConcurrent: 1, minIntervalMs: 0 });

        await limiter.acquire('a.test', 0);

        const startedAt = Date.now();

        expect(await limiter.acquire('a.test', 80)).toBeNull();
        expect(Date.now() - startedAt).toBeGreaterThanOrEqual(79);
    });

    test('releasing twice frees only one slot', async () => {
        const limiter = createHostLimiter({ maxConcurrent: 2, minIntervalMs: 0 });
        const release = await limiter.acquire('a.test', 0);

        await limiter.acquire('a.test', 0);
        release!();
        release!();

        expect(await limiter.acquire('a.test', 0)).toBeFunction();
        expect(await limiter.acquire('a.test', 0)).toBeNull();
    });

    test('a host whose fetches all finished still waits out the gap before the next start', async () => {
        const limiter = createHostLimiter({ maxConcurrent: 1, minIntervalMs: 40 });
        const release = await limiter.acquire('a.test', 0);

        release!();

        expect(await limiter.acquire('a.test', 0)).toBeNull();

        await Bun.sleep(60);

        expect(await limiter.acquire('a.test', 0)).toBeFunction();
    });
});
