// Auth form schemas: password and name limits, email format, code clean-up and the change-password rule.

import { describe, expect, test } from 'bun:test';
import {
    changePasswordSchema,
    codeSchema,
    emailSchema,
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
    resetPasswordSchema,
    signInSchema,
    signUpSchema,
} from '../../../src/features/auth/schemas';

const VALID_SIGN_UP = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'analytical-engine' };

describe('new passwords', () => {
    test.each([
        [MIN_PASSWORD_LENGTH - 1, false],
        [MIN_PASSWORD_LENGTH, true],
        [MAX_PASSWORD_LENGTH, true],
        [MAX_PASSWORD_LENGTH + 1, false],
    ])('%i characters is valid: %p', (length, valid) => {
        expect(resetPasswordSchema.safeParse({ password: 'a'.repeat(length) }).success).toBe(valid);
    });

    test('sign-in accepts any non-empty password, so older accounts can still sign in', () => {
        expect(signInSchema.safeParse({ email: 'ada@example.com', password: 'short' }).success).toBe(true);
        expect(signInSchema.safeParse({ email: 'ada@example.com', password: '' }).success).toBe(false);
    });
});

describe('email', () => {
    test.each(['ada@example.com', 'a.b+tag@sub.example.co.uk'])('accepts %p', (email) => {
        expect(emailSchema.safeParse({ email }).success).toBe(true);
    });

    test('asks for an address when empty, and for a real one when malformed', () => {
        expect(emailSchema.safeParse({ email: '' }).error?.issues[0]?.message).toBe('Enter your email address.');
        expect(emailSchema.safeParse({ email: 'ada@' }).error?.issues[0]?.message).toContain('name@example.com');
    });
});

describe('sign-up name', () => {
    test('rejects an empty or blank name and trims the rest', () => {
        expect(signUpSchema.safeParse({ ...VALID_SIGN_UP, name: '   ' }).success).toBe(false);
        expect(signUpSchema.parse({ ...VALID_SIGN_UP, name: '  Ada  ' }).name).toBe('Ada');
    });
});

describe('verification code', () => {
    test('strips spaces from a pasted code', () => {
        expect(codeSchema.parse({ code: ' 123 456 ' }).code).toBe('123456');
    });

    test.each(['12345', '1234567', '12345a', ''])('rejects %p', (code) => {
        expect(codeSchema.safeParse({ code }).success).toBe(false);
    });
});

describe('change password', () => {
    test('needs a new password that differs from the current one', () => {
        const result = changePasswordSchema.safeParse({ currentPassword: 'same-password', newPassword: 'same-password', revokeOtherSessions: true });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.path).toEqual(['newPassword']);
    });

    test('accepts a different new password', () => {
        expect(changePasswordSchema.safeParse({ currentPassword: 'old-password', newPassword: 'new-password', revokeOtherSessions: false }).success).toBe(true);
    });
});
