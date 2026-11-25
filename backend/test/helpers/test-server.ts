import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { app as apiApp } from '../../src/app';
import { errorHandler } from '../../src/middleware/error-handler';
import { fetchFeedController } from '../../src/modules/feeds/feeds.controller';

// Starts an Express app (the real API by default) on a random free port and returns its URL; call `close()` in afterAll
// so the test process can exit.
export async function startTestServer(app: Express = apiApp) {
    const server: Server = await new Promise((resolve) => {
        const listening = app.listen(0, () => resolve(listening));
    });
    const { port } = server.address() as AddressInfo;

    return {
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    };
}

// GET /api/fetch without its sign-in check: tests have no database, so they can't sign in to the real route.
export function startFetchTestServer() {
    const app = express();

    app.get('/api/fetch', fetchFeedController);
    app.use(errorHandler);

    return startTestServer(app);
}
