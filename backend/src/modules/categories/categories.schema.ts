// Categories belong to one user. "Uncategorized" is not a row: it's a subscription whose category_id is null.

import { sql } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from '../auth/auth.schema';

// A user's folders for feeds (e.g. Frontend, Design), shown in the sidebar in `position` order.
// Names are unique per user ignoring case; `layout` optionally overrides the user's default layout for this category.
export const categories = pgTable(
    'categories',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: text('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        position: integer('position').notNull(),
        layout: text('layout'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('categories_user_id_name_unique').on(t.userId, sql`lower(${t.name})`),
        index('categories_user_id_position_idx').on(t.userId, t.position),
    ],
);
