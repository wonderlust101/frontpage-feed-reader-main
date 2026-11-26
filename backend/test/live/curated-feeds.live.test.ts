// Live check against the real curated feeds. Skipped unless LIVE_FEEDS=1, so CI stays offline:
//   LIVE_FEEDS=1 bun run test:live

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { FeedErrorResponse, FetchFeedResponse } from '@frontpage/shared';
import sampleFeeds from '../../data/sample-feeds.json';
import { startFetchTestServer } from '../helpers/test-server';

const feeds = sampleFeeds.categories.flatMap((category) => category.feeds);

describe.skipIf(!process.env.LIVE_FEEDS)('live curated feeds via GET /api/fetch', () => {
    let api: Awaited<ReturnType<typeof startFetchTestServer>>;

    beforeAll(async () => {
        api = await startFetchTestServer();
    });

    afterAll(async () => {
        await api?.close();
    });

    test('there are 19 curated feeds', () => {
        expect(feeds).toHaveLength(19);
    });

    test.each(feeds.map((feed) => [feed.title, feed.feedUrl] as const))(
        '%s returns clean JSON',
        async (_title, feedUrl) => {
            const res = await fetch(`${api.url}/api/fetch?url=${encodeURIComponent(feedUrl)}`);
            const body = (await res.json()) as Partial<FetchFeedResponse & FeedErrorResponse>;

            expect({ status: res.status, error: body.error }).toEqual({ status: 200, error: undefined });

            const feed = body.feed!;

            expect(feed.title).not.toBe('');
            expect(feed.items.length).toBeGreaterThan(0);

            for (const item of feed.items) {
                expect(item.title).not.toBe('');
                expect(item.url).toMatch(/^https?:\/\//);
                expect(item.contentHtml).not.toMatch(/<script|\son[a-z]+=|javascript:/i);

                if (item.publishedAt)
                    expect(new Date(item.publishedAt).toISOString()).toBe(item.publishedAt);
            }
        },
        30_000,
    );
});
