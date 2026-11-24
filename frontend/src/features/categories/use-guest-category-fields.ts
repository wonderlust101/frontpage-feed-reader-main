'use client';

// Each curated category's preset, or the colour the guest chose for it on this device.

import { useCategoryFields } from './category-field-store';
import type { FieldChoices } from './fields';
import { GUEST_CATEGORIES } from './guest-categories';

const GUEST_IDS = GUEST_CATEGORIES.map((category) => category.id);

const GUEST_PRESETS: FieldChoices = Object.fromEntries(GUEST_CATEGORIES.map((category) => [category.id, category.preset]));

export function useGuestCategoryFields() {
    return useCategoryFields(GUEST_IDS, GUEST_PRESETS);
}
