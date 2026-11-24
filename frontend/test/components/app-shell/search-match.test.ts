import { describe, expect, test } from 'bun:test';
import { matchParts } from '../../../src/components/app-shell/search-match';

describe('matchParts', () => {
    test('marks a match at the start, ignoring case', () => {
        expect(matchParts('Container queries', 'con')).toEqual([
            { text: 'Con', isMatch: true },
            { text: 'tainer queries', isMatch: false },
        ]);
    });

    test('marks every match and keeps the text between', () => {
        expect(matchParts('a cat, a hat', 'at')).toEqual([
            { text: 'a c', isMatch: false },
            { text: 'at', isMatch: true },
            { text: ', a h', isMatch: false },
            { text: 'at', isMatch: true },
        ]);
    });

    test('ignores spaces around the query', () => {
        expect(matchParts('Design', '  sign ')).toEqual([
            { text: 'De', isMatch: false },
            { text: 'sign', isMatch: true },
        ]);
    });

    test('returns the text unmarked for an empty query or no match', () => {
        expect(matchParts('Design', '')).toEqual([{ text: 'Design', isMatch: false }]);
        expect(matchParts('Design', 'zz')).toEqual([{ text: 'Design', isMatch: false }]);
    });
});
