// Graceful shutdown: stop taking requests, close the database, then exit. A failed close still exits (with 1),
// so the process never hangs waiting on an unhandled rejection.

import { errorMessage } from './lib/error-code';

type ClosableServer = { close: (done: () => void) => unknown };

export function shutdown(server: ClosableServer, closeDatabase: () => Promise<void>, exit: (code: number) => void = process.exit): void {
    server.close(() => {
        closeDatabase().then(
            () => exit(0),
            (err: unknown) => {
                console.error('Shutdown failed:', errorMessage(err));
                exit(1);
            },
        );
    });
}
