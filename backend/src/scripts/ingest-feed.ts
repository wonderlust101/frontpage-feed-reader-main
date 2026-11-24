// Ingests one feed into the local database and prints what changed, for checking ingestion by hand.
// Refuses any database that isn't local, because on the host Bun loads backend/.env, which points at Neon.
// Usage: docker compose run --rm --no-deps backend bun run ingest:feed <url>

import { db, pool } from '../db';
import { env } from '../env';
import { ingestFeed } from '../modules/feeds/feeds.ingest';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'db']);

const url = process.argv[2];
if (!url) {
    console.error('Usage: bun run ingest:feed <feed url>');
    process.exit(1);
}

const host = env.DATABASE_URL ? new URL(env.DATABASE_URL).hostname : null;
if (!db || !host || !LOCAL_HOSTS.has(host)) {
    console.error(`Refusing to run: DATABASE_URL must point at a local database (localhost or db), not ${host ?? 'nothing'}.`);
    process.exit(1);
}

try {
    console.log(JSON.stringify(await ingestFeed(db, url), null, 2));
} finally {
    await pool?.end();
}
