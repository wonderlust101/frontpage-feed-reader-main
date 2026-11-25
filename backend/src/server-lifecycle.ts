// Graceful shutdown: stop the background refresh and stop taking requests at once, close the database once both have
// finished, then exit. A failed close still exits (with 1), so the process never hangs waiting on an unhandled rejection.

import { errorMessage } from './lib/error-code';

type ClosableServer = { close: (done: () => void) => unknown };

type Closers = {
    // Called at once, so the refresh claims nothing new; resolves when the burst in progress has finished.
    stopScheduler?: () => Promise<void>;
    closeDatabase: () => Promise<void>;
};

export function shutdown(server: ClosableServer, { stopScheduler, closeDatabase }: Closers, exit: (code: number) => void = process.exit): void {
    const serverClosed = new Promise<void>((resolve) => {
        server.close(() => resolve());
    });

    Promise.all([serverClosed, stopScheduler?.()])
        .then(closeDatabase)
        .then(
            () => exit(0),
            (err: unknown) => {
                console.error('Shutdown failed:', errorMessage(err));
                exit(1);
            },
        );
}
