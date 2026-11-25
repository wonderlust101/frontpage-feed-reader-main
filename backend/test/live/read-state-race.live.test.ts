// Marking an item must wait for a "mark all as read" in progress on its feed (the FOR SHARE lock in items.read-state.ts).
// PGlite has one connection, so this needs real Postgres: the local Docker one, never Neon. Run with the Docker db up:
//   LIVE_FEEDS=1 RACE_TEST_DATABASE_URL=postgres://frontpage:frontpage@localhost:5432/frontpage bun run test:live

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Database } from '../../src/db';
import * as schema from '../../src/db/schema';
import { feeds, items, subscriptions, users } from '../../src/db/schema';
import { setItemsRead } from '../../src/modules/items/items.read-state';
import { getItem } from '../../src/modules/items/items.service';
import { newFeed, newUser } from '../helpers/factories';

const DATABASE_URL = process.env.RACE_TEST_DATABASE_URL ?? '';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const LOCK_WAIT_TIMEOUT_MS = 5000;
const POLL_MS = 20;
const WAITING_ON_LOCKS = `select count(*)::int as waiting from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'`;

describe.skipIf(!process.env.LIVE_FEEDS)('live: two tabs on real Postgres', () => {
    let pool: Pool;

    beforeAll(() => {
        if (!DATABASE_URL)
            return;

        if (!LOCAL_HOSTS.has(new URL(DATABASE_URL).hostname))
            throw new Error('RACE_TEST_DATABASE_URL must point at the local Docker Postgres (localhost), never Neon');

        pool = new Pool({ connectionString: DATABASE_URL, max: 3 });
    });

    afterAll(async () => {
        await pool?.end();
    });

    test.skipIf(!DATABASE_URL)('an item marked unread during a mark-all waits for it, and ends unread (last write wins)', async () => {
        await withReaderAndItem(async (db, reader, itemId) => {
            // Tab A: a mark-all that has moved the cutoff but not committed yet. Tab B: marks the item unread meanwhile.
            await expectWriteToWaitFor('update subscriptions set read_cutoff = now() where user_id = $1', reader, () =>
                setItemsRead(db, reader, { itemIds: [itemId], isRead: false }),
            );

            expect((await getItem(db, reader, itemId)).isRead).toBe(false);
        });
    });

    test.skipIf(!DATABASE_URL)('two item writes to the same feed take turns, so they can\'t deadlock on its marks', async () => {
        await withReaderAndItem(async (db, reader, itemId) => {
            // Tab A holds the weakest lock another write could; tab B must still wait for it.
            await expectWriteToWaitFor('select id from subscriptions where user_id = $1 for share', reader, () =>
                setItemsRead(db, reader, { itemIds: [itemId], isRead: true }),
            );
        });
    });

    // A reader following one feed with one item, deleted again afterwards even when the test fails.
    async function withReaderAndItem(run: (db: Database, reader: string, itemId: string) => Promise<void>) {
        const db = drizzle({ client: pool, schema });
        const reader = await newUser(db);
        const feed = await newFeed(db);

        try {
            await db.insert(subscriptions).values({ userId: reader, feedId: feed });

            const [item] = await db
                .insert(items)
                .values({ feedId: feed, guid: 'race', title: 'Race', summary: '', contentHtml: '', hasFullContent: false, contentHash: 'race' })
                .returning({ id: items.id });

            await run(db, reader, item!.id);
        } finally {
            await db.delete(users).where(eq(users.id, reader));
            await db.delete(feeds).where(eq(feeds.id, feed));
        }
    }

    // Runs `lockStatement` in an open transaction on its own connection, starts `write`, checks that it waits for that
    // transaction, then commits and lets the write finish.
    async function expectWriteToWaitFor(lockStatement: string, reader: string, write: () => Promise<unknown>) {
        const connection = await pool.connect();
        let pending: Promise<unknown> | undefined;

        try {
            await connection.query('begin');
            await connection.query(lockStatement, [reader]);
            pending = write();
            expect(await isBlockedOnLock(pool, pending)).toBe(true);
        } finally {
            await connection.query('commit');
            connection.release();
        }

        await pending;
    }
});

// True once Postgres reports a query waiting on a row lock; false if `pending` finishes first (it never waited).
async function isBlockedOnLock(pool: Pool, pending: Promise<unknown>): Promise<boolean> {
    let finished = false;

    // Both outcomes count as finished; the caller awaits `pending` itself, so a failure still fails the test.
    function markFinished() {
        finished = true;
    }

    pending.then(markFinished, markFinished);

    const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;

    while (!finished && Date.now() < deadline) {
        const { rows } = await pool.query<{ waiting: number }>(WAITING_ON_LOCKS);

        if (rows[0]?.waiting)
            return true;

        await Bun.sleep(POLL_MS);
    }

    return false;
}
