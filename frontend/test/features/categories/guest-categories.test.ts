import { describe, expect, test } from 'bun:test';
import { GUEST_CATEGORIES, guestCategoryHref } from '../../../src/features/categories/guest-categories';

describe('guestCategoryHref', () => {
    test('is the category\'s page under /guest/c/', () => {
        expect(guestCategoryHref('frontend')).toBe('/guest/c/frontend');
    });

    test('gives every guest category its own href', () => {
        const hrefs = GUEST_CATEGORIES.map((category) => guestCategoryHref(category.id));

        expect(new Set(hrefs).size).toBe(GUEST_CATEGORIES.length);
    });
});
