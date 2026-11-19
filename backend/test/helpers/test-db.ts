import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { join } from 'node:path';
import * as schema from '../../src/db/schema';

const MIGRATIONS_DIR = join(import.meta.dir, '../../drizzle');

// A fresh in-memory Postgres (PGlite) with every committed migration applied, so DB tests run offline; call `close()` in afterAll.
export async function createTestDb() {
    const client = new PGlite();
    const db = drizzle({ client, schema });
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    return { db, close: () => client.close() };
}
