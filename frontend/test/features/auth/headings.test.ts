// signInArrival: which greeting the sign-in page shows, read from ?reset=. codeStepHeading: what the code step says.

import { CODE_LENGTH, CODE_LIFETIME_MINUTES } from '@frontpage/shared';
import { describe, expect, test } from 'bun:test';
import { codeStepHeading, signInArrival } from '../../../src/features/auth/headings';

describe('signInArrival', () => {
    test('greets a reader back from a password reset', () => {
        expect(signInArrival({ reset: '1' })).toBe('reset');
    });

    test('is null for a plain visit, whatever else is in the URL', () => {
        expect(signInArrival({})).toBeNull();
        expect(signInArrival({ next: '/user' })).toBeNull();
        expect(signInArrival({ verified: '1' })).toBeNull();
    });
});

describe('codeStepHeading', () => {
    test('says where the code went and how long it lasts', () => {
        expect(codeStepHeading('ada@example.com').description).toBe(
            `We sent a ${CODE_LENGTH}-digit code to ada@example.com. It expires in ${CODE_LIFETIME_MINUTES} minutes.`,
        );
    });
});
