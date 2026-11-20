import { describe, expect, test } from 'bun:test';
import { LINK_PROTOCOLS, resolveUrl } from '../../../src/lib/feed/urls';

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
