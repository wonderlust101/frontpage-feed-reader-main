import { describe, expect, test } from 'bun:test';
import { currentHref, formatCount } from '../../../src/components/app-shell/nav-entries';

describe('currentHref', () => {
    test('matches the href that is the pathname', () => {
        expect(currentHref('/user', ['/user'])).toBe('/user');
    });

    test('falls back to the parent entry on a nested page', () => {
        expect(currentHref('/user/saved', ['/user'])).toBe('/user');
    });

    test('picks the longest matching href', () => {
        expect(currentHref('/user/c/abc/item/1', ['/user', '/user/c/abc', '/user/c'])).toBe('/user/c/abc');
    });

    test('never matches part of a segment', () => {
        expect(currentHref('/username', ['/user'])).toBeNull();
    });

    test('returns null when nothing matches', () => {
        expect(currentHref('/guest', ['/user', '#saved'])).toBeNull();
    });
});

describe('formatCount', () => {
    test.each([undefined, null, 0])('shows nothing for %p', (count) => {
        expect(formatCount(count)).toBeNull();
    });

    test.each([
        [1, '1'],
        [99, '99'],
        [100, '99+'],
        [1234, '99+'],
    ])('shows %p as %p', (count, shown) => {
        expect(formatCount(count)).toBe(shown);
    });
});
