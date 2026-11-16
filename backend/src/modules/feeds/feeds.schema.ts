import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Placeholder table so drizzle-kit has something to generate.
// Replace/extend with the real model (feeds, items, read state, bookmarks…).
export const feeds = pgTable('feeds', {
    id: uuid('id').primaryKey().defaultRandom(),
    url: text('url').notNull().unique(),
    title: text('title'),
    category: text('category'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
