// The guest's curated categories, in order, with their preset fields and their sources: the same catalogue as
// backend/data/sample-feeds.json (keep the two in step). Guest mode shows them in the app shell, each with its own
// page at /guest/c/<id>, and search finds their sources. A guest may recolor them (useGuestCategoryFields).

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
