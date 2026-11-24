// Item titles are illustrative. READER_CATEGORIES adds categories a reader might make, two still on "No color".

import type { HealthMarkState } from '@/components/ui/health-mark';
import { NO_FIELD, fieldOrNone, type Field, type FieldChoices } from '@/features/categories/fields';
import { GUEST_CATEGORIES, type GuestCategoryId } from '@/features/categories/guest-categories';

export type CategoryId = GuestCategoryId;

export type Category = {
    id: CategoryId;
    name: string;
    field: Field;
    sources: string[];
};

export type SampleItem = {
    id: string;
    title: string;
    source: string;
    category: CategoryId;
    time: string;
    isNew: boolean;
    health: HealthMarkState;
};

export const CATEGORY_PRESETS: FieldChoices = Object.fromEntries(GUEST_CATEGORIES.map((category) => [category.id, category.preset]));

export const CATEGORIES: Category[] = GUEST_CATEGORIES.map(({ preset, sources, ...category }) => ({
    ...category,
    sources: [...sources],
    field: fieldOrNone(preset),
}));

export const READER_CATEGORIES: { name: string; field: Field }[] = [
    ...CATEGORIES.map((category) => ({ name: category.name, field: category.field })),
    { name: 'World news', field: NO_FIELD },
    { name: 'Film & TV', field: fieldOrNone('rose') },
    { name: 'Football', field: fieldOrNone('leaf') },
    { name: 'Cooking', field: NO_FIELD },
];

export const SAMPLE_READER = { name: 'Alex Morgan', email: 'alex@example.com', emailVerified: false };

export const SAMPLE_ITEMS: SampleItem[] = [
    {
        id: 'local-models',
        title: 'Notes on running small models locally for code review',
        source: "Simon Willison's Weblog",
        category: 'ai',
        time: '09:42',
        isNew: true,
        health: 'healthy',
    },
    {
        id: 'container-queries',
        title: 'Container queries in practice: three real layouts',
        source: 'CSS-Tricks',
        category: 'frontend',
        time: '09:15',
        isNew: true,
        health: 'healthy',
    },
    {
        id: 'on-call',
        title: 'What on-call looks like at forty engineers',
        source: 'The Pragmatic Engineer',
        category: 'tech',
        time: '07:30',
        isNew: true,
        health: 'healthy',
    },
    {
        id: 'disclosure',
        title: 'Progressive disclosure, revisited',
        source: 'Nielsen Norman Group',
        category: 'design',
        time: 'Yest.',
        isNew: false,
        health: 'healthy',
    },
    {
        id: 'cdn-logs',
        title: 'Why your CDN logs and your analytics disagree',
        source: 'Netlify Blog',
        category: 'backend',
        time: '3 d',
        isNew: false,
        health: 'stale',
    },
    {
        id: 'alt-text',
        title: 'Writing alt text people actually use',
        source: 'A List Apart',
        category: 'design',
        time: '2 w',
        isNew: false,
        health: 'failing',
    },
];

// Throws on an unknown id, which only happens if the sample data is edited wrongly.
export function getCategory(id: CategoryId): Category {
    const category = CATEGORIES.find((candidate) => candidate.id === id);

    if (!category)
        throw new Error(`Unknown category: ${id}`);

    return category;
}
