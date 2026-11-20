// Subscriptions link a user to a global feed and hold everything personal about it.
// `read_cutoff` makes "mark all as read" one update: items first seen before it count as read unless marked otherwise.

import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { users } from '../auth/auth.schema';
import { categories } from '../categories/categories.schema';
import { feeds } from '../feeds/feeds.schema';

// One row per feed a user follows: their own title for it, its category (null = Uncategorized) and its read cutoff.
// A feed can't be deleted while anyone follows it; deleting a category moves its feeds to Uncategorized.
export const subscriptions = pgTable(
    'subscriptions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: text('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        feedId: uuid('feed_id')
            .notNull()
            .references(() => feeds.id, { onDelete: 'restrict' }),
        categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
        customTitle: text('custom_title'),
        readCutoff: timestamp('read_cutoff', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        unique('subscriptions_user_id_feed_id_unique').on(t.userId, t.feedId),
        index('subscriptions_category_id_idx').on(t.categoryId),
        index('subscriptions_feed_id_idx').on(t.feedId),
    ],
);
