// The guest's curated categories: the same catalogue as backend/data/sample-feeds.json, so keep the two in step.

import type { FieldId } from './fields';

type GuestCategory = {
    id: string;
    name: string;
    preset: FieldId;
    sources: readonly string[];
};

export const GUEST_CATEGORIES = [
    {
        id: 'frontend',
        name: 'Frontend',
        preset: 'coral',
        sources: ['CSS-Tricks', 'Smashing Magazine', 'Josh W. Comeau', 'Kent C. Dodds', 'web.dev', 'MDN Blog'],
    },
    {
        id: 'design',
        name: 'Design',
        preset: 'sky',
        sources: ['Sidebar.io', 'Nielsen Norman Group', 'Figma Blog', 'A List Apart', 'UX Collective'],
    },
    {
        id: 'backend',
        name: 'Backend & DevOps',
        preset: 'leaf',
        sources: ['Cloudflare Blog', 'Vercel Blog', 'The GitHub Blog', 'Netlify Blog'],
    },
    {
        id: 'tech',
        name: 'General Tech',
        preset: 'lilac',
        sources: ['The Pragmatic Engineer', 'Hacker News Best'],
    },
    {
        id: 'ai',
        name: 'AI & ML',
        preset: 'tangerine',
        sources: ["Simon Willison's Weblog", 'Hugging Face Blog'],
    },
] as const satisfies readonly GuestCategory[];

export type GuestCategoryId = (typeof GUEST_CATEGORIES)[number]['id'];
