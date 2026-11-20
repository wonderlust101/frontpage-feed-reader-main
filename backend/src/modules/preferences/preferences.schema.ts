import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../auth/auth.schema';

// One row per user with their reading settings; a user without a row gets the column defaults.
// `last_visited_at` remembers the previous visit, for a "since you were last here" view.
export const userPreferences = pgTable(
    'user_preferences',
    {
        userId: text('user_id')
            .primaryKey()
            .references(() => users.id, { onDelete: 'cascade' }),
        layout: text('layout').notNull().default('list'),
        refreshIntervalMinutes: integer('refresh_interval_minutes').notNull().default(30),
        itemOrder: text('item_order').$type<'newest' | 'oldest'>().notNull().default('newest'),
        showRead: boolean('show_read').notNull().default(true),
        lastVisitedAt: timestamp('last_visited_at', { withTimezone: true }),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        check('user_preferences_refresh_interval_check', sql`${t.refreshIntervalMinutes} in (0, 15, 30, 60)`),
        check('user_preferences_item_order_check', sql`${t.itemOrder} in ('newest', 'oldest')`),
    ],
);
