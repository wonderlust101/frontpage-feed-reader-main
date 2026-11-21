// Sample categories and items for the design system page.
// Category and source names come from backend/data/sample-feeds.json; item titles are illustrative.
// Categories take their fields from the palette in creation order, exactly as user-made categories will.

import type { FeedHealth } from '@/components/ui/health-mark';
import { nextField, type Field } from '@/features/categories/fields';

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

const GUEST_CATEGORIES: Omit<Category, 'field'>[] = [
    {
        id: 'frontend',
        name: 'Frontend',
        sources: ['CSS-Tricks', 'Smashing Magazine', 'Josh W. Comeau', 'Kent C. Dodds', 'web.dev', 'MDN Blog'],
    },
    {
        id: 'design',
        name: 'Design',
        sources: ['Sidebar.io', 'Nielsen Norman Group', 'Figma Blog', 'A List Apart', 'UX Collective'],
    },
    {
        id: 'backend',
        name: 'Backend & DevOps',
        sources: ['Cloudflare Blog', 'Vercel Blog', 'The GitHub Blog', 'Netlify Blog'],
    },
    {
        id: 'tech',
        name: 'General Tech',
        sources: ['The Pragmatic Engineer', 'Hacker News Best'],
    },
    {
        id: 'ai',
        name: 'AI & ML',
        sources: ["Simon Willison's Weblog", 'Hugging Face Blog'],
    },
];

export const CATEGORIES: Category[] = GUEST_CATEGORIES.reduce<Category[]>(
    (assigned, category) => [...assigned, { ...category, field: nextField(assigned.map((taken) => taken.field.id)) }],
    [],
);

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
