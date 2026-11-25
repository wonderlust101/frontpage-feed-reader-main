import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { shutdown } from '../src/server-lifecycle';

// A server whose close() finishes at once, as Node's does once open requests end.
const server = { close: (done: () => void) => done() };

// Runs shutdown and resolves with the exit code it chose.
function exitCodeOf(closeDatabase: () => Promise<void>): Promise<number> {
    return new Promise((resolve) => {
        shutdown(server, closeDatabase, resolve);
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
});
