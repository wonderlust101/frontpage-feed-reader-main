'use client';

// The design system page's hero: a full-width color field with a straight edge. Inside the page grid, the specimen
// headline and intro take the left column and a sticker pile the right, both within the header row's gutters.
// The capsules that recolor the field sit below the reading controls (HeroCategorySwitch); the choice is shared
// through HeroChoiceProvider. Category colors come from the guest's saved choices, else each sample category's preset.

import type { CSSProperties } from 'react';
import { Logo } from '@/components/logo';
import { Stickers, type Sticker } from '@/components/stickers';
import { useCategoryFields } from '@/features/categories/category-field-store';
import { BRAND_FIELD } from '@/features/categories/fields';
import { ThemeSwitch } from '@/features/preferences/components/theme-switch';
import { CATEGORIES, CATEGORY_PRESETS } from '../_data/sample-data';
import { SECTIONS } from '../_data/sections';
import { CATEGORY_IDS, useHeroChoice } from './hero-choice';

const SOURCE_COUNT = CATEGORIES.reduce((total, category) => total + category.sources.length, 0);

// Positions, sizes and drift are in container units of the pile (a 4:3 box filling the right column), so the pile
// keeps its arrangement at any width and never leaves the column.
const HERO_STICKERS: Sticker[] = [
    {
        shape: 'pill',
        field: 'var(--color-field-sky)',
        icon: 'newsletter',
        label: 'Newsletters',
        size: '3.8cqi',
        x: '8.7cqi',
        y: '3cqi',
        tilt: -6,
        drift: ['3.4cqi', '3cqi'],
    },
    { shape: 'square', field: 'var(--color-field-lemon)', label: 'New!', size: '15.3cqi', x: '45.7cqi', y: '0cqi', tilt: -9, drift: ['-1.5cqi', '4cqi'] },
    {
        shape: 'circle',
        field: 'var(--color-field-rose)',
        icon: 'ai-summary',
        size: '16.5cqi',
        x: '66.6cqi',
        y: '0.5cqi',
        tilt: 12,
        drift: ['-3.7cqi', '3.7cqi'],
    },
    {
        shape: 'square',
        field: 'var(--color-field-leaf)',
        label: '24 unread',
        size: '22.2cqi',
        x: '35.8cqi',
        y: '16.8cqi',
        tilt: -8,
        drift: ['-3.2cqi', '2cqi'],
    },
    {
        shape: 'circle',
        field: 'var(--color-field-tangerine)',
        icon: 'caught-up',
        size: '20.5cqi',
        x: '3.8cqi',
        y: '27.2cqi',
        tilt: -12,
        drift: ['2.5cqi', '-0.7cqi'],
    },
    { shape: 'circle', field: 'var(--color-field-coral)', icon: 'feed', size: '25.6cqi', x: '65.4cqi', y: '27.4cqi', tilt: 10, drift: ['-4.4cqi', '-1.5cqi'] },
    {
        shape: 'pill',
        field: 'var(--color-field-lilac)',
        icon: 'saved',
        label: 'Saved for later',
        size: '3.8cqi',
        x: '0.1cqi',
        y: '55.8cqi',
        tilt: 6,
        drift: ['3cqi', '-2.5cqi'],
    },
    {
        shape: 'pill',
        field: 'var(--color-field-aqua)',
        icon: 'website',
        label: 'Any website',
        size: '3.8cqi',
        x: '45.7cqi',
        y: '55.8cqi',
        tilt: -3,
        drift: ['-1cqi', '-2.5cqi'],
    },
    { shape: 'circle', field: 'var(--color-field-sky)', icon: 'mark-unread', size: '13.8cqi', x: '86.2cqi', y: '55.8cqi', tilt: 6, drift: ['-4cqi', '-2cqi'] },
];

// Renders the field: top bar, then the headline and intro beside the sticker pile, then the live caption.
// Every text block sits on a sticker-safe plate, so a sticker that reaches it mid-hover tucks behind.
export function HeroField() {
    const { choice } = useHeroChoice();
    const [fields] = useCategoryFields(CATEGORY_IDS, CATEGORY_PRESETS);
    const category = CATEGORIES.find((candidate) => candidate.id === choice);
    const field = category ? fields[category.id].color : BRAND_FIELD.color;
    const caption = category
        ? `${category.name} · ${category.sources.join(', ')}`
        : `All categories · ${SOURCE_COUNT} sources in ${CATEGORIES.length} categories`;

    return (
        <header className="hero-field relative" style={{ color: field, '--sticker-field-color': field } as CSSProperties}>
            <div className="sticker-field bg-current">
                <div className="hero-field-ink on-field mx-auto max-w-page px-gutter pb-12" style={{ color: 'var(--color-on-field)' }}>
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-5">
                        <a href="#main" className="sr-only focus:not-sr-only">
                            Skip to content
                        </a>
                        <p className="sticker-safe flex items-baseline gap-3">
                            <Logo size="md" variant="ink" />
                            <span className="text-ui font-medium">Design system</span>
                        </p>
                        <nav aria-label="Sections" className="order-3 -mx-1 flex w-full flex-wrap gap-1 md:order-none md:w-auto lg:hidden">
                            {SECTIONS.map((section) => (
                                <a key={section.id} href={`#${section.id}`} className="rounded-toggle px-3 py-2.5 text-ui font-medium hover:underline">
                                    {section.label}
                                </a>
                            ))}
                        </nav>
                        <div className="sticker-safe ml-auto">
                            <ThemeSwitch contrast={field} />
                        </div>
                    </div>

                    <div className="mt-[clamp(1.5rem,5vw,4.5rem)] gap-x-[clamp(2rem,4vw,5rem)] lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
                        <div>
                            <h1 className="sticker-safe type-specimen">
                                <span className="sr-only">Frontpage design system: </span>
                                Type leads.
                                <br />
                                Color maps.
                            </h1>
                            <p className="sticker-safe mt-8 max-w-[34rem] text-body leading-[1.55] font-medium">
                                Every token and component on this page is live. Pick a category to recolor this field, tune the reading controls, switch the
                                theme.
                            </p>
                        </div>
                        <div className="relative hidden aspect-[4/3] lg:block">
                            <Stickers stickers={HERO_STICKERS} className="stickers-pile" />
                        </div>
                    </div>
                    <p className="sticker-safe mt-6 text-meta font-semibold lg:ml-auto lg:text-right">{caption}</p>
                </div>
            </div>
        </header>
    );
}
