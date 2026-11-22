// authErrorMessage: known codes map to their sentence; status decides offline, rate-limit and server-down messages.

import { describe, expect, test } from 'bun:test';
import { authErrorMessage } from '../../../src/features/auth/error-messages';

describe('authErrorMessage', () => {
    test('keeps sign-in failures vague', () => {
        expect(authErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 })).toBe('Email or password is incorrect. Check both and try again.');
    });

    test.each([
        ['USER_ALREADY_EXISTS', 'already exists'],
        ['USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', 'already exists'],
        ['INVALID_EMAIL', 'name@example.com'],
        ['PASSWORD_TOO_SHORT', 'at least 8'],
        ['PASSWORD_TOO_LONG', 'at most 128'],
        ['INVALID_PASSWORD', 'current password'],
        ['INVALID_TOKEN', 'reset link'],
        ['EMAIL_NOT_VERIFIED', 'Confirm your email'],
        ['SESSION_NOT_FRESH', 'sign in again'],
        ['SESSION_EXPIRED', 'sign in again'],
        ['INVALID_OTP', "doesn't match"],
        ['OTP_EXPIRED', 'expired'],
        ['TOO_MANY_ATTEMPTS', 'Too many wrong codes'],
    ])('maps %s', (code, expected) => {
        expect(authErrorMessage({ code, status: 400 })).toContain(expected);
    });

    test('says how long to wait when rate-limited', () => {
        expect(authErrorMessage({ status: 429, retryAfterSeconds: 8 })).toBe('Too many attempts. Try again in 8 seconds.');
        expect(authErrorMessage({ status: 429, retryAfterSeconds: 1 })).toBe('Too many attempts. Try again in 1 second.');
        expect(authErrorMessage({ status: 429 })).toBe('Too many attempts. Wait a minute, then try again.');
    });

    test('reports server and network trouble', () => {
        expect(authErrorMessage({ code: 'database_unavailable', status: 503 })).toContain('unavailable right now');
        expect(authErrorMessage({ status: 500 })).toContain('unavailable right now');
        expect(authErrorMessage({ status: 0 })).toContain('Check your connection');
    });

    test('falls back for unknown codes', () => {
        expect(authErrorMessage({ code: 'SOMETHING_NEW', status: 400 })).toBe('Something went wrong. Try again in a moment.');
        expect(authErrorMessage({ status: 404 })).toBe('Something went wrong. Try again in a moment.');
    });
});
