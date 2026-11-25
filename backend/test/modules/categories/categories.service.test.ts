// The categories service against an in-memory Postgres (PGlite): a reader may only use their own categories.

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { HttpError } from '../../../src/errors';
import { assertOwnCategory } from '../../../src/modules/categories/categories.service';
import { createTestDb } from '../../helpers/test-db';
import { SAMPLE_UUID, newCategory, newUser } from '../../helpers/factories';

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

describe('assertOwnCategory', () => {
    test("passes for the reader's own category", async () => {
        const reader = await newUser(testDb.db);
        const categoryId = await newCategory(testDb.db, reader);

        expect(await assertOwnCategory(testDb.db, reader, categoryId)).toBeUndefined();
    });

    test("another reader's category → 404 category_not_found", async () => {
        const owner = await newUser(testDb.db);
        const categoryId = await newCategory(testDb.db, owner);

        const err = await assertOwnCategory(testDb.db, await newUser(testDb.db), categoryId).catch((thrown: unknown) => thrown);

        expect(err).toBeInstanceOf(HttpError);
        expect(err).toMatchObject({ status: 404, code: 'category_not_found' });
    });

    test('a category that does not exist → 404 category_not_found', async () => {
        const err = await assertOwnCategory(testDb.db, await newUser(testDb.db), SAMPLE_UUID).catch((thrown: unknown) => thrown);

        expect(err).toMatchObject({ status: 404, code: 'category_not_found' });
    });
});
