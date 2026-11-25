// Live SSRF check: public DNS names that point at 127.0.0.1 (what an attacker would use to dodge a hostname
// check) must be refused by GET /api/fetch. Needs real DNS, so it's opt-in: bun run test:live

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { FeedErrorResponse } from '@frontpage/shared';
import { startTestServer } from '../helpers/test-server';

describe.skipIf(!process.env.LIVE_FEEDS)('live SSRF protection via GET /api/fetch', () => {
    let api: Awaited<ReturnType<typeof startTestServer>>;

    beforeAll(async () => {
        api = await startTestServer();
    });

    afterAll(async () => {
        await api?.close();
    });

    test.each(['localtest.me', '127.0.0.1.nip.io'])('refuses %s', async (host) => {
        const res = await fetch(`${api.url}/api/fetch?url=${encodeURIComponent(`http://${host}:${new URL(api.url).port}/api/health`)}`);

        expect(res.status).toBe(400);
        expect(((await res.json()) as FeedErrorResponse).error.code).toBe('blocked_url');
    });
});
