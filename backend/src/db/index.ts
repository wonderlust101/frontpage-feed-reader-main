import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { env } from "../env";
import * as schema from "./schema";
import type { DbStatus } from "../types";

// The backend is a long-running server (Railway), so it keeps one node-postgres pool
// for its whole lifetime and reuses connections across requests. DATABASE_URL is Neon's
// *pooled* connection string (PgBouncer, host contains "-pooler"); migrations use the
// direct string instead (see drizzle.config.ts).
export const pool = env.DATABASE_URL
  ? new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      // Neon computes scale to zero; the first connection after a suspend can take a moment.
      connectionTimeoutMillis: 10_000,
    })
  : null;

// An idle pooled connection can be dropped by the server (e.g. compute suspended);
// log it instead of crashing the process. The pool replaces the connection.
pool?.on("error", (err) => {
  console.error("Postgres pool error:", err.message);
});

/** `null` when DATABASE_URL isn't configured — the API still runs without a DB. */
export const db = pool ? drizzle({ client: pool, schema }) : null;

export async function checkDatabase(): Promise<{ status: DbStatus; error?: string }> {
  if (!db) return { status: "skipped" };
  try {
    await db.execute(sql`select 1`);
    return { status: "connected" };
  } catch (err) {
    // Drizzle wraps driver errors; the useful message is on `cause`.
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause : err;
    return { status: "error", error: cause instanceof Error ? cause.message : String(cause) };
  }
}

/** Closes all pooled connections. Called on shutdown. */
export async function closeDatabase() {
  await pool?.end();
}
