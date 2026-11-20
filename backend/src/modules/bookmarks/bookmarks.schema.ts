// Bookmarks are a user's saved items. They outlive the subscription (unsubscribing keeps them), and pruning old items can
// never remove a bookmarked one (or its feed), because the foreign key to items is RESTRICT.

import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../auth/auth.schema';
import { items } from '../items/items.schema';

// One row per item a user saved, with when they saved it. Blocks deleting the item while it exists.
export const bookmarks = pgTable(
    'bookmarks',
    {
        userId: text('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        itemId: uuid('item_id')
            .notNull()
            .references(() => items.id, { onDelete: 'restrict' }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        primaryKey({ columns: [t.userId, t.itemId] }),
        index('bookmarks_user_id_created_at_idx').on(t.userId, t.createdAt.desc().nullsFirst(), t.itemId.desc().nullsFirst()),
        index('bookmarks_item_id_idx').on(t.itemId),
    ],
);
