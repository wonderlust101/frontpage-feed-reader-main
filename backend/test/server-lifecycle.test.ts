import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { shutdown } from '../src/server-lifecycle';

// A server whose close() finishes at once, as Node's does once open requests end.
const server = { close: (done: () => void) => done() };

// Runs shutdown and resolves with the exit code it chose.
function exitCodeOf(closeDatabase: () => Promise<void>, stopScheduler?: () => Promise<void>): Promise<number> {
    return new Promise((resolve) => {
        shutdown(server, { stopScheduler, closeDatabase }, resolve);
    });
}

afterEach(() => {
    mock.restore();
});

describe('shutdown', () => {
    test('exits with 0 once the database is closed', async () => {
        const closeDatabase = mock(() => Promise.resolve());

        expect(await exitCodeOf(closeDatabase)).toBe(0);
        expect(closeDatabase).toHaveBeenCalledTimes(1);
    });

    test('still exits, with 1, when closing the database fails', async () => {
        const logged = spyOn(console, 'error').mockImplementation(() => {});

        expect(await exitCodeOf(() => Promise.reject(new Error('pool already ended')))).toBe(1);
        expect(logged).toHaveBeenCalledWith('Shutdown failed:', 'pool already ended');
    });

    test('stops the scheduler at once, and closes the database only after its burst has finished', async () => {
        let finishBurst = () => {};
        const stopScheduler = mock(() => new Promise<void>((resolve) => {
            finishBurst = resolve;
        }));
        const closeDatabase = mock(() => Promise.resolve());
        const exitCode = exitCodeOf(closeDatabase, stopScheduler);

        expect(stopScheduler).toHaveBeenCalledTimes(1);

        await Bun.sleep(10);
        expect(closeDatabase).not.toHaveBeenCalled();

        finishBurst();

        expect(await exitCode).toBe(0);
        expect(closeDatabase).toHaveBeenCalledTimes(1);
    });
});
