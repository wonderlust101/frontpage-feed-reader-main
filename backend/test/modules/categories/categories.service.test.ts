// The categories service against an in-memory Postgres (PGlite): a reader may only use their own categories.

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { categories, users } from '../../../src/db/schema';
import { HttpError } from '../../../src/errors';
import { assertOwnCategory } from '../../../src/modules/categories/categories.service';
import { createTestDb } from '../../helpers/test-db';

const RANDOM_ID = '0b6f7e7c-3a4d-4f1e-9b8a-2c5d6e7f8a9b';

let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
    testDb = await createTestDb();
});

afterAll(async () => {
    await testDb.close();
});

beforeEach(async () => {
    await testDb.db.execute(sql`truncate table users cascade`);
});

// Inserts a reader and returns their id.
async function newUser(): Promise<string> {
    const id = crypto.randomUUID();

    await testDb.db.insert(users).values({ id, name: 'Reader', email: `${id}@example.com` });

    return id;
}

// Inserts a category for `userId` and returns its id.
async function newCategory(userId: string): Promise<string> {
    const [row] = await testDb.db.insert(categories).values({ userId, name: 'Design', position: 0 }).returning({ id: categories.id });

    return row!.id;
}

describe('assertOwnCategory', () => {
    test("passes for the reader's own category", async () => {
        const reader = await newUser();
        const categoryId = await newCategory(reader);

        expect(await assertOwnCategory(testDb.db, reader, categoryId)).toBeUndefined();
    });

    test("another reader's category → 404 category_not_found", async () => {
        const owner = await newUser();
        const categoryId = await newCategory(owner);

        const err = await assertOwnCategory(testDb.db, await newUser(), categoryId).catch((e: unknown) => e);

        expect(err).toBeInstanceOf(HttpError);
        expect(err).toMatchObject({ status: 404, code: 'category_not_found' });
    });

    test('a category that does not exist → 404 category_not_found', async () => {
        const err = await assertOwnCategory(testDb.db, await newUser(), RANDOM_ID).catch((e: unknown) => e);

        expect(err).toMatchObject({ status: 404, code: 'category_not_found' });
    });
});
