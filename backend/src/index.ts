import { app } from './app';
import { env } from './env';
import { checkDatabase, closeDatabase, db } from './db';
import { startFeedScheduler, type FeedScheduler } from './modules/feeds/feeds.scheduler';
import { shutdown } from './server-lifecycle';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);

    void checkDatabase().then(({ status, error }) => {
        const detail = error ? ` (${error})` : '';

        console.log(`Database: ${status}${detail}`);
    });
});

let scheduler: FeedScheduler | undefined;

if (!db) {
    console.log('Feed refresh: off (no database)');
} else if (!env.FEED_REFRESH_ENABLED) {
    console.log('Feed refresh: off (FEED_REFRESH_ENABLED is not true)');
} else {
    scheduler = startFeedScheduler(db);
    console.log(`Feed refresh: every ${env.FEED_REFRESH_TICK_MINUTES} min`);
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        console.log(`${signal} received, shutting down`);

        shutdown(server, { stopScheduler: scheduler?.stop, closeDatabase });

        setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
    });
}
