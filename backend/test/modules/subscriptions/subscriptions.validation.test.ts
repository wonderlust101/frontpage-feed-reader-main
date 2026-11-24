// Request validation for the subscriptions routes: ids, the subscribe body and the update body, including every rejection.

import { describe, expect, test } from 'bun:test';
import { MAX_CUSTOM_TITLE_LENGTH } from '@frontpage/shared';
import { HttpError } from '../../../src/middleware/errors';
import { parseSubscribeRequest, parseSubscriptionId, parseUpdateSubscriptionRequest } from '../../../src/modules/subscriptions/subscriptions.validation';

const ID = '0b6f7e7c-3a4d-4f1e-9b8a-2c5d6e7f8a9b';

// Runs a call that must throw and returns its HttpError, so a test can check the status and code.
function rejection(call: () => unknown): HttpError {
    try {
        call();
    } catch (err) {
        if (err instanceof HttpError) {
            return err;
        }
        throw err;
    }
    throw new Error('expected the call to throw');
}

describe('parseSubscriptionId', () => {
    test('accepts a UUID in any case', () => {
        expect(parseSubscriptionId(ID)).toBe(ID);
        expect(parseSubscriptionId(ID.toUpperCase())).toBe(ID.toUpperCase());
    });

    test.each(['not-a-uuid', '', `${ID}x`, '123'])('%p → 404 not_found, like an id that is not yours', (value) => {
        expect(rejection(() => parseSubscriptionId(value))).toMatchObject({ status: 404, code: 'not_found' });
    });
});

describe('parseSubscribeRequest', () => {
    test('keeps the url and drops unknown fields', () => {
        expect(parseSubscribeRequest({ url: 'css-tricks.com/feed', userId: 'someone-else', extra: 1 })).toEqual({ url: 'css-tricks.com/feed' });
    });

    test('keeps a category id or null', () => {
        expect(parseSubscribeRequest({ url: 'a.test', categoryId: ID })).toEqual({ url: 'a.test', categoryId: ID });
        expect(parseSubscribeRequest({ url: 'a.test', categoryId: null })).toEqual({ url: 'a.test', categoryId: null });
    });

    test('a missing or non-string url becomes "", which the service rejects as invalid_url', () => {
        expect(parseSubscribeRequest({})).toEqual({ url: '' });
        expect(parseSubscribeRequest({ url: 42 })).toEqual({ url: '' });
    });

    test.each([undefined, null, 'https://a.test', [['https://a.test']], 42])('body %p → 400 bad_request', (body) => {
        expect(rejection(() => parseSubscribeRequest(body))).toMatchObject({ status: 400, code: 'bad_request' });
    });

    test.each([5, 'design', '', {}])('categoryId %p → 400 bad_request', (categoryId) => {
        expect(rejection(() => parseSubscribeRequest({ url: 'a.test', categoryId }))).toMatchObject({ status: 400, code: 'bad_request' });
    });
});

describe('parseUpdateSubscriptionRequest', () => {
    test('trims the custom title', () => {
        expect(parseUpdateSubscriptionRequest({ customTitle: '  My CSS  ' })).toEqual({ customTitle: 'My CSS' });
    });

    test('an empty or blank title clears it (null), and so does null', () => {
        expect(parseUpdateSubscriptionRequest({ customTitle: '' })).toEqual({ customTitle: null });
        expect(parseUpdateSubscriptionRequest({ customTitle: '   ' })).toEqual({ customTitle: null });
        expect(parseUpdateSubscriptionRequest({ customTitle: null })).toEqual({ customTitle: null });
    });

    test('accepts a title of exactly the maximum length, measured after trimming', () => {
        const title = 'x'.repeat(MAX_CUSTOM_TITLE_LENGTH);
        expect(parseUpdateSubscriptionRequest({ customTitle: ` ${title} ` })).toEqual({ customTitle: title });
    });

    test('a title one character too long → 400 bad_request', () => {
        const err = rejection(() => parseUpdateSubscriptionRequest({ customTitle: 'x'.repeat(MAX_CUSTOM_TITLE_LENGTH + 1) }));
        expect(err).toMatchObject({ status: 400, code: 'bad_request', message: 'customTitle must be at most 200 characters' });
    });

    test('moves to a category, or to Uncategorized with null', () => {
        expect(parseUpdateSubscriptionRequest({ categoryId: ID })).toEqual({ categoryId: ID });
        expect(parseUpdateSubscriptionRequest({ categoryId: null })).toEqual({ categoryId: null });
    });

    test('changes both fields at once and drops unknown ones', () => {
        expect(parseUpdateSubscriptionRequest({ customTitle: 'A', categoryId: null, feedId: ID })).toEqual({ customTitle: 'A', categoryId: null });
    });

    test.each([{}, { feedId: ID }])('a body with neither field (%p) → 400 bad_request', (body) => {
        expect(rejection(() => parseUpdateSubscriptionRequest(body))).toMatchObject({ status: 400, code: 'bad_request' });
    });

    test.each([{ customTitle: 5 }, { customTitle: ['A'] }, { categoryId: 5 }, { categoryId: 'abc' }])('%p → 400 bad_request', (body) => {
        expect(rejection(() => parseUpdateSubscriptionRequest(body))).toMatchObject({ status: 400, code: 'bad_request' });
    });

    test.each([undefined, null, 'title', [[]]])('body %p → 400 bad_request', (body) => {
        expect(rejection(() => parseUpdateSubscriptionRequest(body))).toMatchObject({ status: 400, code: 'bad_request' });
    });
});
