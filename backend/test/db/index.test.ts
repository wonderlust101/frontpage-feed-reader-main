// The database module without DATABASE_URL (test/setup.ts blanks it): no pool, and requireDatabase() refuses with 503.

import { describe, expect, test } from 'bun:test';
import { db, requireDatabase } from '../../src/db';
import { ServiceUnavailableError } from '../../src/middleware/errors';

describe('requireDatabase without DATABASE_URL', () => {
    test('db is null', () => {
        expect(db).toBeNull();
    });

    test('throws a retryable 503 database_unavailable', () => {
        let thrown: unknown;

        try {
            requireDatabase();
        } catch (err) {
            thrown = err;
        }

        expect(thrown).toBeInstanceOf(ServiceUnavailableError);
        expect(thrown).toMatchObject({ status: 503, code: 'database_unavailable', retryable: true });
    });
});
