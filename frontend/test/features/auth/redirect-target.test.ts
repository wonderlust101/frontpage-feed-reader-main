// safeNextPath: same-site paths pass through; anything a browser would read as another site falls back to /user.

import { describe, expect, test } from 'bun:test';
import { DEFAULT_AFTER_SIGN_IN, safeNextPath } from '../../../src/features/auth/redirect-target';

describe('safeNextPath', () => {
    test('keeps a same-site path with its query and hash', () => {
        expect(safeNextPath('/user?x=1#top')).toBe('/user?x=1#top');
        expect(safeNextPath('/account/password')).toBe('/account/password');
    });

    test('falls back when next is missing or empty', () => {
        expect(safeNextPath(null)).toBe(DEFAULT_AFTER_SIGN_IN);
        expect(safeNextPath(undefined)).toBe(DEFAULT_AFTER_SIGN_IN);
        expect(safeNextPath('')).toBe(DEFAULT_AFTER_SIGN_IN);
    });

    test.each(['//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', 'https://evil.com', 'javascript:alert(1)', 'user', ' /user'])(
        'rejects %p',
        (next) => {
            expect(safeNextPath(next)).toBe(DEFAULT_AFTER_SIGN_IN);
        },
    );
});
