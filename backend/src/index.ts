import { app } from './app';
import { env } from './env';
import { checkDatabase, closeDatabase } from './db';
import { shutdown } from './server-lifecycle';

const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);

    void checkDatabase().then(({ status, error }) => console.log(`Database: ${status}${error ? ` (${error})` : ''}`));
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        console.log(`${signal} received, shutting down`);

        shutdown(server, closeDatabase);

        setTimeout(() => process.exit(1), 10_000).unref();
    });
}
