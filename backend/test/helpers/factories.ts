// Rows that many database tests need, inserted with sensible defaults. Each takes the test's own database.

import { categories, feeds, users } from '../../src/db/schema';
import type { Database } from '../../src/db';

// A well-formed id that no row has.
export const SAMPLE_UUID = '0b6f7e7c-3a4d-4f1e-9b8a-2c5d6e7f8a9b';

export async function newUser(db: Database): Promise<string> {
    const id = crypto.randomUUID();

    await db.insert(users).values({ id, name: 'Reader', email: `${id}@example.com` });

    return id;
}

export async function newCategory(db: Database, userId: string, name = 'Design', position = 0): Promise<string> {
    const [row] = await db.insert(categories).values({ userId, name, position }).returning({ id: categories.id });

    if (!row)
        throw new Error('Inserting the category returned no row');

    return row.id;
}

// A feed at a fresh URL; `values` overrides any column.
export async function newFeed(db: Database, values: Partial<typeof feeds.$inferInsert> = {}): Promise<string> {
    const [row] = await db
        .insert(feeds)
        .values({ url: `https://feeds.example/${crypto.randomUUID()}.xml`, title: 'Example', ...values })
        .returning({ id: feeds.id });

    if (!row)
        throw new Error('Inserting the feed returned no row');

    return row.id;
}
