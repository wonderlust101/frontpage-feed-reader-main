// Items are global like feeds: one row per article per feed, shared by every user who follows that feed.
// Dedup key is (feed_id, guid); `first_seen_at` is set once on insert, so an edited article never looks new again.

import { sql } from 'drizzle-orm';
import { boolean, customType, index, pgTable, primaryKey, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { users } from '../auth/auth.schema';
import { feeds } from '../feeds/feeds.schema';

const tsvector = customType<{ data: string }>({
    dataType: () => 'tsvector',
});

// One row per article in a feed. `published_at` / `updated_at` are the article's own dates from the feed (either may be null);
// `sort_at` (published date, else first seen) orders lists, and `search` indexes title + summary for full-text search.
export const items = pgTable(
    'items',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        feedId: uuid('feed_id')
            .notNull()
            .references(() => feeds.id, { onDelete: 'cascade' }),
        guid: text('guid').notNull(),
        url: text('url'),
        title: text('title').notNull(),
        author: text('author'),
        summary: text('summary').notNull(),
        contentHtml: text('content_html').notNull(),
        hasFullContent: boolean('has_full_content').notNull(),
        imageUrl: text('image_url'),
        categories: text('categories')
            .array()
            .notNull()
            .default(sql`'{}'::text[]`),
        publishedAt: timestamp('published_at', { withTimezone: true }),
        updatedAt: timestamp('updated_at', { withTimezone: true }),
        firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
        sortAt: timestamp('sort_at', { withTimezone: true })
            .notNull()
            .generatedAlwaysAs(sql`coalesce(published_at, first_seen_at)`),
        contentHash: text('content_hash').notNull(),
        search: tsvector('search').generatedAlwaysAs(sql`setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', summary), 'B')`),
    },
    (t) => [
        unique('items_feed_id_guid_unique').on(t.feedId, t.guid),
        index('items_feed_id_sort_at_idx').on(t.feedId, t.sortAt.desc().nullsFirst(), t.id.desc().nullsFirst()),
        index('items_feed_id_first_seen_at_idx').on(t.feedId, t.firstSeenAt),
        index('items_search_idx').using('gin', t.search),
    ],
);

// A user's explicit read/unread choices that differ from their subscription's read cutoff (e.g. opened an item, or marked one unread).
// "Mark all as read" deletes the rows it covers, so this table stays small; rows also vanish when their item is pruned.
export const itemReadStates = pgTable(
    'item_read_states',
    {
        userId: text('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        itemId: uuid('item_id')
            .notNull()
            .references(() => items.id, { onDelete: 'cascade' }),
        isRead: boolean('is_read').notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.userId, t.itemId] }), index('item_read_states_item_id_idx').on(t.itemId)],
);
