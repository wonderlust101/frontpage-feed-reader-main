import { describe, expect, test } from 'bun:test';
import { LINK_PROTOCOLS, feedIconUrl, resolveUrl } from '../../../src/lib/feed/urls';

const BASE = 'https://site.example/blog/post';

describe('resolveUrl', () => {
    test('makes relative URLs absolute against the base', () => {
        expect(resolveUrl('../about', BASE)).toBe('https://site.example/about');
        expect(resolveUrl('  /img/a.png  ', BASE)).toBe('https://site.example/img/a.png');
    });

    test('a blank URL is null, not the base URL', () => {
        expect(resolveUrl('   ', BASE)).toBeNull();
        expect(resolveUrl('', BASE)).toBeNull();
        expect(resolveUrl(null, BASE)).toBeNull();
    });

    test('only http(s) by default; mailto only when allowed', () => {
        expect(resolveUrl('javascript:alert(1)', BASE)).toBeNull();
        expect(resolveUrl('data:text/html,hi', BASE)).toBeNull();
        expect(resolveUrl('mailto:a@site.example', BASE)).toBeNull();
        expect(resolveUrl('mailto:a@site.example', BASE, LINK_PROTOCOLS)).toBe('mailto:a@site.example');
    });

    test('invalid and overlong URLs are null', () => {
        expect(resolveUrl('http://', BASE)).toBeNull();
        expect(resolveUrl(`https://site.example/${'a'.repeat(2_100)}`, BASE)).toBeNull();
    });
});

describe('feedIconUrl', () => {
    test("uses the feed's own image when it has one", () => {
        expect(feedIconUrl('https://cdn.example/logo.png', 'https://site.example/')).toBe('https://cdn.example/logo.png');
    });

    test("falls back to the site's /favicon.ico at the site root", () => {
        expect(feedIconUrl(null, 'https://site.example/blog/')).toBe('https://site.example/favicon.ico');
    });

    test('is null when there is no image and no site', () => {
        expect(feedIconUrl(null, null)).toBeNull();
    });

    test('is null for a broken or non-web site URL', () => {
        expect(feedIconUrl(null, 'not a url')).toBeNull();
        expect(feedIconUrl(null, 'javascript:alert(1)')).toBeNull();
    });
});
