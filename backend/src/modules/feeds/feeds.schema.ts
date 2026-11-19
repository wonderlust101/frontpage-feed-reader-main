// Placeholder feeds table so drizzle-kit has something to generate; replace it with the real model.

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Feed subscriptions by URL (placeholder until the real feeds model replaces it).
export const feeds = pgTable('feeds', {
    id: uuid('id').primaryKey().defaultRandom(),
    url: text('url').notNull().unique(),
    title: text('title'),
    category: text('category'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
