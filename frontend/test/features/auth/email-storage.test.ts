// Email hand-offs: the pending email (sessionStorage) for the verify page, and the sign-in email (localStorage) that
// lasts an hour and is cleared once read. Storage that is blocked must never throw into the page.

import { CODE_LIFETIME_MINUTES } from '@frontpage/shared';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
    forgetPendingEmail,
    readPendingEmail,
    readSignInEmail,
    rememberPendingEmail,
    rememberSignInEmail,
    takeSignInEmail,
} from '../../../src/features/auth/email-storage';

const SIGN_IN_KEY = 'frontpage-sign-in-email';

const HOUR_MS = 60 * 60 * 1000;

const CODE_LIFETIME_MS = CODE_LIFETIME_MINUTES * 60 * 1000;

const realNow = Date.now;

const realLocalStorage = globalThis.localStorage;

const realSessionStorage = globalThis.sessionStorage;

beforeEach(() => {
    globalThis.localStorage = memoryStorage();
    globalThis.sessionStorage = memoryStorage();
});

afterEach(() => {
    Date.now = realNow;
    globalThis.localStorage = realLocalStorage;
    globalThis.sessionStorage = realSessionStorage;
});

describe('pending email', () => {
    test('is read back until it is forgotten', () => {
        rememberPendingEmail('ada@example.com');
        expect(readPendingEmail()).toBe('ada@example.com');
        forgetPendingEmail();
        expect(readPendingEmail()).toBeNull();
    });

    test('lapses once its code has expired', () => {
        rememberPendingEmail('ada@example.com');
        Date.now = () => realNow() + CODE_LIFETIME_MS - 1000;
        expect(readPendingEmail()).toBe('ada@example.com');
        Date.now = () => realNow() + CODE_LIFETIME_MS + 1;
        expect(readPendingEmail()).toBeNull();
    });

    test('is null, without throwing, when storage is blocked', () => {
        globalThis.sessionStorage = blockedStorage();
        expect(() => rememberPendingEmail('ada@example.com')).not.toThrow();
        expect(readPendingEmail()).toBeNull();
    });
});

describe('sign-in email', () => {
    test('is returned once, then cleared', () => {
        rememberSignInEmail('ada@example.com');
        expect(takeSignInEmail()).toBe('ada@example.com');
        expect(takeSignInEmail()).toBeNull();
    });

    test('can be read without clearing it, then taken', () => {
        rememberSignInEmail('ada@example.com');
        expect(readSignInEmail()).toBe('ada@example.com');
        expect(takeSignInEmail()).toBe('ada@example.com');
        expect(readSignInEmail()).toBeNull();
    });

    test('is dropped after an hour', () => {
        rememberSignInEmail('ada@example.com');
        Date.now = () => realNow() + HOUR_MS + 1;
        expect(takeSignInEmail()).toBeNull();

        Date.now = realNow;
        expect(readSignInEmail()).toBeNull();
    });

    test('is null for broken or unexpected saved values', () => {
        for (const saved of ['not json', '"just a string"', '{"email":42,"savedAt":1}', '{"email":"ada@example.com"}', 'null']) {
            localStorage.setItem(SIGN_IN_KEY, saved);
            expect(takeSignInEmail()).toBeNull();
        }
    });

    test('is null, without throwing, when storage is blocked', () => {
        globalThis.localStorage = blockedStorage();
        expect(() => rememberSignInEmail('ada@example.com')).not.toThrow();
        expect(takeSignInEmail()).toBeNull();
    });
});

// A minimal in-memory Storage, enough for the module under test.
function memoryStorage(): Storage {
    const items = new Map<string, string>();

    return {
        get length() {
            return items.size;
        },
        clear: () => items.clear(),
        getItem: (key) => items.get(key) ?? null,
        key: (index) => [...items.keys()][index] ?? null,
        removeItem: (key) => void items.delete(key),
        setItem: (key, value) => void items.set(key, String(value)),
    };
}

// A Storage that throws on every call, like a blocked one in some private windows.
function blockedStorage(): Storage {
    const blocked = () => {
        throw new Error('blocked');
    };

    return { length: 0, clear: blocked, getItem: blocked, key: blocked, removeItem: blocked, setItem: blocked };
}
