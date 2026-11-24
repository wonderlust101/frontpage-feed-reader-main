import { describe, expect, test } from 'bun:test';
import { findCurrentHref, formatCount, shellPlace } from '../../../src/components/app-shell/nav-entries';

describe('findCurrentHref', () => {
    test('matches the href that is the pathname', () => {
        expect(findCurrentHref('/user', ['/user'])).toBe('/user');
    });

    test('falls back to the parent entry on a nested page', () => {
        expect(findCurrentHref('/user/saved', ['/user'])).toBe('/user');
    });

    test('picks the longest matching href', () => {
        expect(findCurrentHref('/user/c/abc/item/1', ['/user', '/user/c/abc', '/user/c'])).toBe('/user/c/abc');
    });

    test('never matches part of a segment', () => {
        expect(findCurrentHref('/username', ['/user'])).toBeNull();
    });

    test('returns null when nothing matches', () => {
        expect(findCurrentHref('/guest', ['/user', '#saved'])).toBeNull();
    });
});

describe('shellPlace', () => {
    test('marks only the category inside a category', () => {
        expect(shellPlace('/guest/c/design', '/guest', ['/guest'], ['/guest/c/design'])).toEqual({ view: null, category: '/guest/c/design' });
    });

    test('marks "All items" in both columns on the home page itself', () => {
        expect(shellPlace('/guest', '/guest', ['/guest'], ['/guest/c/design'])).toEqual({ view: '/guest', category: '/guest' });
    });

    test('marks no category on another view', () => {
        expect(shellPlace('/guest/saved', '/guest', ['/guest', '/guest/saved'], ['/guest/c/design'])).toEqual({ view: '/guest/saved', category: null });
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
