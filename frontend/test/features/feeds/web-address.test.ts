import { describe, expect, test } from 'bun:test';
import { webAddress } from '../../../src/features/feeds/web-address';

describe('webAddress', () => {
    test('adds https to a bare site', () => {
        expect(webAddress('  css-tricks.com ')?.href).toBe('https://css-tricks.com/');
    });

    test('keeps a full feed link, http included', () => {
        expect(webAddress('https://web.dev/feed.xml')?.href).toBe('https://web.dev/feed.xml');
        expect(webAddress('http://example.org/rss')?.protocol).toBe('http:');
    });

    test('rejects what cannot be a web address', () => {
        expect(webAddress('')).toBeNull();
        expect(webAddress('not a site')).toBeNull();
        expect(webAddress('localhost')).toBeNull();
        expect(webAddress('https://')).toBeNull();
    });
});
