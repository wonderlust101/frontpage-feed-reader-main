// authErrorMessage: known codes map to their sentence; status decides offline, rate-limit and server-down messages.

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@frontpage/shared';
import { describe, expect, test } from 'bun:test';
import { authErrorMessage } from '../../../src/features/auth/error-messages';

describe('authErrorMessage', () => {
    test('keeps sign-in failures vague', () => {
        expect(authErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 })).toBe("That email and password don't match. Check both and try again.");
    });

    test.each([
        ['USER_ALREADY_EXISTS', 'already exists'],
        ['USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', 'already exists'],
        ['INVALID_EMAIL', 'name@example.com'],
        ['PASSWORD_TOO_SHORT', `at least ${MIN_PASSWORD_LENGTH}`],
        ['PASSWORD_TOO_LONG', `at most ${MAX_PASSWORD_LENGTH}`],
        ['INVALID_PASSWORD', 'current password'],
        ['INVALID_TOKEN', 'reset link'],
        ['EMAIL_NOT_VERIFIED', 'Confirm your email'],
        ['UNAUTHORIZED', 'Sign in again'],
        ['INVALID_OTP', "doesn't match"],
        ['OTP_EXPIRED', 'expired'],
        ['TOO_MANY_ATTEMPTS', 'Too many wrong codes'],
    ])('maps %s', (code, expected) => {
        expect(authErrorMessage({ code, status: 400 })).toContain(expected);
    });

    test('says how long to wait when rate-limited', () => {
        expect(authErrorMessage({ status: 429, retryAfterSeconds: 8 })).toBe('Too many tries in a row. Try again in 8 seconds.');
        expect(authErrorMessage({ status: 429, retryAfterSeconds: 1 })).toBe('Too many tries in a row. Try again in 1 second.');
        expect(authErrorMessage({ status: 429 })).toBe('Too many tries in a row. Take a minute, then try again.');
    });

    test('reports server and network trouble', () => {
        expect(authErrorMessage({ code: 'database_unavailable', status: 503 })).toContain('unavailable right now');
        expect(authErrorMessage({ status: 500 })).toContain('unavailable right now');
        expect(authErrorMessage({ status: 0, offline: true })).toContain('Check your connection');
        expect(authErrorMessage({ status: 0, offline: false })).toBe("Can't reach Frontpage right now. Try again in a few minutes.");
    });

    test('falls back for unknown codes', () => {
        expect(authErrorMessage({ code: 'SOMETHING_NEW', status: 400 })).toBe('Something went wrong on our end. Try again in a moment.');
        expect(authErrorMessage({ status: 404 })).toBe('Something went wrong on our end. Try again in a moment.');
    });
});
