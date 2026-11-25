import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { join } from 'node:path';
import * as schema from '../../src/db/schema';

const MIGRATIONS_DIR = join(import.meta.dir, '../../drizzle');

// In-memory Postgres with every committed migration; `queries` records each query's SQL for tests that count them.
export async function createTestDb() {
    const client = new PGlite();
    const queries: string[] = [];
    let recording = false;
    const db = drizzle({ client, schema, logger: { logQuery: (query) => recording && queries.push(query) } });

    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    recording = true;

    return { db, queries, close: () => client.close() };
}
