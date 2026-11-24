'use client';

// The guest categories' fields: each curated category's preset, or the color the guest chose for it on this device.
// The guest shell and each guest category's title read it, so a recolor shows in the row, the toolbar tag and the title.

import { useCategoryFields } from './category-field-store';
import type { FieldChoices } from './fields';
import { GUEST_CATEGORIES } from './guest-categories';

const GUEST_IDS = GUEST_CATEGORIES.map((category) => category.id);

const GUEST_PRESETS: FieldChoices = Object.fromEntries(GUEST_CATEGORIES.map((category) => [category.id, category.preset]));

// Returns every guest category's field by id, and a setter that saves a guest's choice.
export function useGuestCategoryFields() {
    return useCategoryFields(GUEST_IDS, GUEST_PRESETS);
}
