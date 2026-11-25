import { describe, expect, test } from 'bun:test';
import { GUEST_CATEGORIES, guestCategoryColor, guestCategoryHref } from '../../../src/features/categories/guest-categories';

describe('guestCategoryHref', () => {
    test("is the category's page under /guest/c/", () => {
        expect(guestCategoryHref('frontend')).toBe('/guest/c/frontend');
    });

    test('gives every guest category its own href', () => {
        const hrefs = GUEST_CATEGORIES.map((category) => guestCategoryHref(category.id));

        expect(new Set(hrefs).size).toBe(GUEST_CATEGORIES.length);
    });
});

describe('guestCategoryColor', () => {
    test("is the guest's saved choice when there is one, else the preset's field", () => {
        expect(guestCategoryColor({ id: 'design', preset: 'sky' })).toBe('var(--category-design, var(--color-field-sky))');
    });
});
