import { app } from './app';
import { env } from './env';
import { checkDatabase, closeDatabase } from './db';
import { shutdown } from './server-lifecycle';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);

    void checkDatabase().then(({ status, error }) => {
        const detail = error ? ` (${error})` : '';

        console.log(`Database: ${status}${detail}`);
    });
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        console.log(`${signal} received, shutting down`);

        shutdown(server, closeDatabase);

        setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
    });
}
