// Postgres through Drizzle: one connection pool for the server's lifetime, using Neon's pooled DATABASE_URL.
// Without DATABASE_URL, `db` is null and the API runs without a database.

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { env } from '../env';
import { ServiceUnavailableError } from '../middleware/errors';
import * as schema from './schema';
import type { DbStatus } from '@frontpage/shared';

// Any Drizzle database with our schema: the node-postgres pool in the server, or PGlite in tests (createTestDb()).
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export const pool = env.DATABASE_URL
    ? new Pool({
            connectionString: env.DATABASE_URL,
            max: 10,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 10_000,
        })
    : null;

// Neon can drop idle connections (e.g. when compute suspends): log it instead of crashing; the pool reconnects.
pool?.on('error', (err) => {
    console.error('Postgres pool error:', err.message);
});

export const db = pool ? drizzle({ client: pool, schema }) : null;

// For routes that can't work without a database; throws `database_unavailable` (503) when there is none.
export function requireDatabase(): Database {
    if (!db)
        throw new ServiceUnavailableError('database_unavailable', 'This feature is unavailable: the API has no database');

    return db;
}

// For /api/health: 'connected', 'skipped' (no DATABASE_URL) or 'error' with the driver's message.
export async function checkDatabase(): Promise<{ status: DbStatus; error?: string }> {
    if (!db)
        return { status: 'skipped' };

    try {
        await db.execute(sql`select 1`);

        return { status: 'connected' };
    } catch (err) {
        // Drizzle wraps driver errors; the useful message is on `cause`.
        const cause = err instanceof Error && err.cause instanceof Error ? err.cause : err;

        return { status: 'error', error: cause instanceof Error ? cause.message : String(cause) };
    }
}

export async function closeDatabase() {
    await pool?.end();
}
