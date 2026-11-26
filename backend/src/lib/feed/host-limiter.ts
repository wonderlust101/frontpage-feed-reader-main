// Politeness per feed host: at most `maxConcurrent` fetches at once, started at least `minIntervalMs` apart. The state
// lives in this process, enough for the one Railway server. Waiters poll rather than queue, so a wait is bounded, not fair.

import { setTimeout as sleep } from 'node:timers/promises';

export type HostLimiter = {
    acquire: (host: string, maxWaitMs: number) => Promise<Release | null>;
};

type Release = () => void;

type HostLimits = {
    maxConcurrent: number;
    minIntervalMs: number;
};

type HostState = {
    active: number;
    lastStartAt: number;
};

const POLL_MS = 50;

export function createHostLimiter({ maxConcurrent, minIntervalMs }: HostLimits): HostLimiter {
    const hosts = new Map<string, HostState>();

    // Takes a slot if the host has one free and its gap since the last start has passed.
    function tryStart(host: string): Release | null {
        const now = Date.now();
        const state = hosts.get(host) ?? { active: 0, lastStartAt: -Infinity };

        if (state.active >= maxConcurrent || now - state.lastStartAt < minIntervalMs)
            return null;

        state.active++;
        state.lastStartAt = now;
        hosts.set(host, state);

        let released = false;

        return () => {
            if (released)
                return;

            released = true;
            state.active--;
            forgetWhenIdle(host, state);
        };
    }

    // An idle host needs no entry once its gap has passed, so the map only holds hosts fetched recently.
    function forgetWhenIdle(host: string, state: HostState) {
        if (state.active > 0)
            return;

        const gapLeftMs = Math.max(0, state.lastStartAt + minIntervalMs - Date.now());

        setTimeout(() => {
            if (state.active === 0 && hosts.get(host) === state)
                hosts.delete(host);
        }, gapLeftMs).unref();
    }

    // Resolves with a release function once a slot is free, or null if none frees up within `maxWaitMs`.
    async function acquire(host: string, maxWaitMs: number): Promise<Release | null> {
        const deadline = Date.now() + maxWaitMs;

        for (;;) {
            const release = tryStart(host);

            if (release)
                return release;

            if (Date.now() >= deadline)
                return null;

            await sleep(Math.min(POLL_MS, deadline - Date.now()));
        }
    }

    return { acquire };
}
