import { app } from './app';
import { env } from './env';
import { checkDatabase, closeDatabase } from './db';

const server = app.listen(env.PORT, async () => {
    console.log(`API listening on port ${env.PORT}`);

    const { status, error } = await checkDatabase();

    console.log(`Database: ${status}${error ? ` (${error})` : ''}`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        console.log(`${signal} received, shutting down`);

        server.close(async () => {
            await closeDatabase();
            process.exit(0);
        });

        setTimeout(() => process.exit(1), 10_000).unref();
    });
}
