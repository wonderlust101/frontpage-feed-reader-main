// Feeds are global: one row per feed URL, fetched once however many users follow it. Personal data (custom title,
// category, read state) lives on subscriptions. Health (active / stale / error / dead) is derived from the fetch columns, not stored.

import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { FeedErrorCode, FeedFormat } from '@frontpage/shared';

// One row per feed URL: what the feed says about itself, plus how the last fetches went and when to fetch it next.
// `url` is updated when the feed permanently redirects; `next_fetch_at` moves further out after each failure (backoff).
export const feeds = pgTable(
    'feeds',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        url: text('url').notNull().unique(),

        // What the feed says about itself (refreshed on every successful fetch).
        title: text('title').notNull(),
        description: text('description'),
        siteUrl: text('site_url'),
        imageUrl: text('image_url'),
        format: text('format').$type<FeedFormat>(),
        language: text('language'),

        // Sent back on the next fetch so an unchanged feed answers 304.
        etag: text('etag'),
        lastModified: text('last_modified'),

        // How recent fetches went; feed health is derived from these.
        lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
        lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
        lastErrorCode: text('last_error_code').$type<FeedErrorCode>(),
        lastErrorMessage: text('last_error_message'),
        lastErrorStatus: integer('last_error_status'),
        consecutiveFailures: integer('consecutive_failures').notNull().default(0),
        latestItemAt: timestamp('latest_item_at', { withTimezone: true }),

        // When the scheduler should fetch it next (indexed below).
        nextFetchAt: timestamp('next_fetch_at', { withTimezone: true }).notNull().defaultNow(),

        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [index('feeds_next_fetch_at_idx').on(t.nextFetchAt)],
);

// The curated catalogue (data/sample-feeds.json): feeds shown to guests and offered to new users as starter packs.
export const starterFeeds = pgTable('starter_feeds', {
    feedId: uuid('feed_id')
        .primaryKey()
        .references(() => feeds.id, { onDelete: 'cascade' }),
    categoryName: text('category_name').notNull(),
    position: integer('position').notNull(),
});
