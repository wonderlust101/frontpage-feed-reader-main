import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { join } from 'node:path';
import * as schema from '../../src/db/schema';

const MIGRATIONS_DIR = join(import.meta.dir, '../../drizzle');

// A fresh in-memory Postgres (PGlite) with every committed migration applied, so DB tests run offline; call `close()` in afterAll.
// `queries` records the SQL of every query run through `db` (migrations excluded), for tests that check how many a call makes.
export async function createTestDb() {
    const client = new PGlite();
    const queries: string[] = [];
    let recording = false;
    const db = drizzle({ client, schema, logger: { logQuery: (query) => recording && queries.push(query) } });

    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    recording = true;

    return { db, queries, close: () => client.close() };
}
