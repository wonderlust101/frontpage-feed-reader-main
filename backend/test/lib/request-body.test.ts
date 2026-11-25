import { describe, expect, test } from 'bun:test';
import { requireJsonObject } from '../../src/lib/request-body';
import { httpErrorThrownBy } from '../helpers/errors';

describe('requireJsonObject', () => {
    test('returns a plain object as it is', () => {
        const body = { isRead: true };

        expect(requireJsonObject(body)).toBe(body);
    });

    test.each([
        ['no body', undefined],
        ['null', null],
        ['an array', [{ isRead: true }]],
        ['a string', 'isRead=true'],
        ['a number', 1],
    ])('%s → 400 bad_request', (_case, body) => {
        expect(httpErrorThrownBy(() => requireJsonObject(body))).toMatchObject({ status: 400, code: 'bad_request' });
    });
});
