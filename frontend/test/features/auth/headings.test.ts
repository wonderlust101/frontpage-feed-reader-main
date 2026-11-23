// signInArrival: which greeting the sign-in page shows, read from ?reset= and ?verified=.

import { describe, expect, test } from 'bun:test';
import { signInArrival } from '../../../src/features/auth/headings';

describe('signInArrival', () => {
    test('greets a reader back from a password reset', () => {
        expect(signInArrival({ reset: '1' })).toBe('reset');
    });

    test('greets a reader who just confirmed their email', () => {
        expect(signInArrival({ verified: '1' })).toBe('verified');
    });

    test('prefers the reset greeting if both are present', () => {
        expect(signInArrival({ reset: '1', verified: '1' })).toBe('reset');
    });

    test('is null for a plain visit, whatever else is in the URL', () => {
        expect(signInArrival({})).toBeNull();
        expect(signInArrival({ next: '/user' })).toBeNull();
    });
});
