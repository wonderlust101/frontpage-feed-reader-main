import { describe, expect, test } from 'bun:test';
import { parseFetchUrl } from '../../../src/modules/feeds/feeds.validation';

describe('parseFetchUrl', () => {
    test('passes a single url through', () => {
        expect(parseFetchUrl({ url: 'css-tricks.com/feed' })).toBe('css-tricks.com/feed');
    });

    test('a missing or repeated url is undefined', () => {
        expect(parseFetchUrl({})).toBeUndefined();
        expect(parseFetchUrl({ url: ['a', 'b'] })).toBeUndefined();
    });
});
