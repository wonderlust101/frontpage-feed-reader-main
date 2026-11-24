'use client';

// The hero field and the capsules that recolor it sit apart on the page, so they share the choice through context.

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useCategoryFields } from '@/features/categories/category-field-store';
import { CategorySwitch } from '@/features/categories/components/category-switch';
import { BRAND_FIELD } from '@/features/categories/fields';
import { CATEGORIES, CATEGORY_PRESETS } from '../_data/sample-data';

type HeroChoice = { choice: string; setChoice: (id: string) => void };

const HeroChoiceContext = createContext<HeroChoice | null>(null);

export const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

export function HeroChoiceProvider({ children }: { children: ReactNode }) {
    const [choice, setChoice] = useState('all');

    return <HeroChoiceContext value={{ choice, setChoice }}>{children}</HeroChoiceContext>;
}

export function useHeroChoice() {
    const context = useContext(HeroChoiceContext);

    if (!context)
        throw new Error('useHeroChoice must be used inside HeroChoiceProvider');

    return context;
}

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
