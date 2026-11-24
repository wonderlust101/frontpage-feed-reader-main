'use client';

// The hero's chosen view ("All" or one category), shared between the field it colors and the capsules that choose it.
// They sit apart on the page: the field in the hero, the capsules just below it.

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useCategoryFields } from '@/features/categories/category-field-store';
import { CategorySwitch } from '@/features/categories/components/category-switch';
import { BRAND_FIELD } from '@/features/categories/fields';
import { CATEGORIES, CATEGORY_PRESETS } from '../_data/sample-data';

type HeroChoice = { choice: string; setChoice: (id: string) => void };

const HeroChoiceContext = createContext<HeroChoice | null>(null);

export const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

// Holds the choice for everything inside it; starts on "All".
export function HeroChoiceProvider({ children }: { children: ReactNode }) {
    const [choice, setChoice] = useState('all');

    return <HeroChoiceContext value={{ choice, setChoice }}>{children}</HeroChoiceContext>;
}

// Reads the choice; only valid inside HeroChoiceProvider.
export function useHeroChoice() {
    const context = useContext(HeroChoiceContext);
    if (!context) {
        throw new Error('useHeroChoice must be used inside HeroChoiceProvider');
    }
    return context;
}

// Renders the capsules that recolor the hero field: "All" (Lemon) and one per sample category, in its saved color.
export function HeroCategorySwitch() {
    const { choice, setChoice } = useHeroChoice();
    const [fields] = useCategoryFields(CATEGORY_IDS, CATEGORY_PRESETS);
    const options = [{ id: 'all', name: 'All', field: BRAND_FIELD }, ...CATEGORIES.map((category) => ({ ...category, field: fields[category.id] }))];

    return (
        <CategorySwitch
            label="Color the field by category"
            options={options}
            value={choice}
            onChange={setChoice}
            className="w-full mx-auto max-w-page px-gutter pt-6"
        />
    );
}
