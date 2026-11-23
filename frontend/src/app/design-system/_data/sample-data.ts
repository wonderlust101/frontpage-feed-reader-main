// Sample categories and items for the design system page.
// Category and source names come from backend/data/sample-feeds.json; item titles are illustrative.
// The guest categories come with preset colors (part of the curated sample); a reader can change them in the Color
// section. New categories start with "No color". READER_CATEGORIES adds example categories a reader might add (not
// guest feeds): two still on No color, and Football sharing Leaf with Backend & DevOps, since categories may share.

import type { FeedHealth } from '@/components/ui/health-mark';
import { NO_FIELD, categoryFieldById, type Field, type FieldChoices } from '@/features/categories/fields';

export type CategoryId = 'frontend' | 'design' | 'backend' | 'tech' | 'ai';

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
    health: FeedHealth;
};

const GUEST_CATEGORIES: (Omit<Category, 'field'> & { preset: Field['id'] })[] = [
    {
        id: 'frontend',
        preset: 'coral',
        name: 'Frontend',
        sources: ['CSS-Tricks', 'Smashing Magazine', 'Josh W. Comeau', 'Kent C. Dodds', 'web.dev', 'MDN Blog'],
    },
    {
        id: 'design',
        preset: 'sky',
        name: 'Design',
        sources: ['Sidebar.io', 'Nielsen Norman Group', 'Figma Blog', 'A List Apart', 'UX Collective'],
    },
    {
        id: 'backend',
        preset: 'leaf',
        name: 'Backend & DevOps',
        sources: ['Cloudflare Blog', 'Vercel Blog', 'The GitHub Blog', 'Netlify Blog'],
    },
    {
        id: 'tech',
        preset: 'lilac',
        name: 'General Tech',
        sources: ['The Pragmatic Engineer', 'Hacker News Best'],
    },
    {
        id: 'ai',
        preset: 'tangerine',
        name: 'AI & ML',
        sources: ["Simon Willison's Weblog", 'Hugging Face Blog'],
    },
];

export const CATEGORY_PRESETS: FieldChoices = Object.fromEntries(GUEST_CATEGORIES.map((category) => [category.id, category.preset]));

export const CATEGORIES: Category[] = GUEST_CATEGORIES.map(({ preset, ...category }) => ({ ...category, field: categoryFieldById(preset) ?? NO_FIELD }));

export const READER_CATEGORIES: { name: string; field: Field }[] = [
    ...CATEGORIES.map((category) => ({ name: category.name, field: category.field })),
    { name: 'World news', field: NO_FIELD },
    { name: 'Film & TV', field: categoryFieldById('rose') ?? NO_FIELD },
    { name: 'Football', field: categoryFieldById('leaf') ?? NO_FIELD },
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

// Looks up a category by id; throws when the id is unknown, which only happens if the sample data is edited wrongly.
export function getCategory(id: CategoryId): Category {
    const category = CATEGORIES.find((candidate) => candidate.id === id);
    if (!category) {
        throw new Error(`Unknown category: ${id}`);
    }
    return category;
}
