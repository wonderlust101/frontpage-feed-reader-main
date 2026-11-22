'use client';

// The design system page's hero: a full-width color field with a straight edge, stickers in the open right side
// beside the headline, and the category capsules on the ground just below it, apart from the stickers.
// Choosing a capsule recolors the field, which is the system's rule in action: one category, one field.
// The capsules wrap rather than scroll, so every category stays reachable however many a reader has. Category colors
// come from the guest's saved choices (the Color section's picker), else each sample category's preset.

import { useState, type CSSProperties } from 'react';
import { Logo } from '@/components/logo';
import { Stickers, type Sticker } from '@/components/stickers';
import { useCategoryFields } from '@/features/categories/category-field-store';
import { CategorySwitch } from '@/features/categories/components/category-switch';
import { BRAND_FIELD } from '@/features/categories/fields';
import { ThemeSwitch } from '@/features/preferences/components/theme-switch';
import { CATEGORIES, CATEGORY_PRESETS } from '../_data/sample-data';
import { SECTIONS } from '../_data/sections';

const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

const SOURCE_COUNT = CATEGORIES.reduce((total, category) => total + category.sources.length, 0);

// Placed in width units only (cqi), so the cluster scales with the headline; it keeps clear of the theme switch above
// and the caption below. Shown from lg, where the headline leaves the right side open.
const HERO_STICKERS: Sticker[] = [
    {
        shape: 'pill',
        field: 'var(--color-field-sky)',
        icon: 'newsletter',
        label: 'Newsletters',
        size: '1.55cqi',
        x: '64.5cqi',
        y: '7.6cqi',
        tilt: -6,
        drift: ['1.4cqi', '1.2cqi'],
    },
    { shape: 'square', field: 'var(--color-field-lemon)', label: 'New!', size: '6.2cqi', x: '79.5cqi', y: '6.4cqi', tilt: -9, drift: ['-0.6cqi', '1.6cqi'] },
    { shape: 'circle', field: 'var(--color-field-rose)', icon: 'ai-summary', size: '6.7cqi', x: '88cqi', y: '6.6cqi', tilt: 12, drift: ['-1.5cqi', '1.5cqi'] },
    { shape: 'square', field: 'var(--color-field-leaf)', label: '24 unread', size: '9cqi', x: '75.5cqi', y: '13.2cqi', tilt: -8, drift: ['-1.3cqi', '0.8cqi'] },
    {
        shape: 'circle',
        field: 'var(--color-field-tangerine)',
        icon: 'caught-up',
        size: '8.3cqi',
        x: '62.5cqi',
        y: '17.4cqi',
        tilt: -12,
        drift: ['1cqi', '-0.3cqi'],
    },
    { shape: 'circle', field: 'var(--color-field-coral)', icon: 'feed', size: '10.4cqi', x: '87.5cqi', y: '17.5cqi', tilt: 10, drift: ['-1.8cqi', '-0.6cqi'] },
    {
        shape: 'pill',
        field: 'var(--color-field-lilac)',
        icon: 'saved',
        label: 'Saved for later',
        size: '1.55cqi',
        x: '61cqi',
        y: '29cqi',
        tilt: 6,
        drift: ['1.2cqi', '-1cqi'],
    },
    {
        shape: 'pill',
        field: 'var(--color-field-aqua)',
        icon: 'website',
        label: 'Any website',
        size: '1.55cqi',
        x: '79.5cqi',
        y: '29cqi',
        tilt: -3,
        drift: ['-0.4cqi', '-1cqi'],
    },
    { shape: 'circle', field: 'var(--color-field-sky)', icon: 'mark-unread', size: '5.6cqi', x: '96cqi', y: '29cqi', tilt: 6, drift: ['-1.6cqi', '-0.8cqi'] },
];

// Renders the field with its top bar, specimen headline, live caption and stickers, then the capsules below it.
// Every text block sits on a sticker-safe plate, so a sticker that runs into it at some width or mid-hover tucks behind.
export function HeroField() {
    const [choice, setChoice] = useState('all');
    const [fields] = useCategoryFields(CATEGORY_IDS, CATEGORY_PRESETS);
    const viewOptions = [{ id: 'all', name: 'All', field: BRAND_FIELD }, ...CATEGORIES.map((category) => ({ ...category, field: fields[category.id] }))];
    const category = CATEGORIES.find((candidate) => candidate.id === choice);
    const field = category ? fields[category.id].color : BRAND_FIELD.color;
    const caption = category
        ? `${category.name} · ${category.sources.join(', ')}`
        : `All categories · ${SOURCE_COUNT} sources in ${CATEGORIES.length} categories`;

    return (
        <header className="hero-field relative" style={{ color: field, '--sticker-field-color': field } as CSSProperties}>
            <div className="sticker-field relative overflow-hidden bg-current">
                <Stickers stickers={HERO_STICKERS} className="stickers-capped hidden lg:block" />
                <div className="hero-field-ink on-field relative mx-auto max-w-page px-gutter pb-12" style={{ color: 'var(--color-on-field)' }}>
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

                    <h1 className="sticker-safe mt-[clamp(1.5rem,5vw,4.5rem)] type-specimen">
                        <span className="sr-only">Frontpage design system: </span>
                        Type leads.
                        <br />
                        Color maps.
                    </h1>
                    <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,34rem)_1fr] md:items-end">
                        <p className="sticker-safe text-body leading-[1.55] font-medium">
                            Every token and component on this page is live. Pick a category to recolor this field, tune the reading controls, switch the theme.
                        </p>
                        <p className="sticker-safe text-meta font-semibold md:ml-auto md:text-right">{caption}</p>
                    </div>
                </div>
            </div>

            <CategorySwitch
                label="Color the field by category"
                options={viewOptions}
                value={choice}
                onChange={setChoice}
                className="mx-auto max-w-page px-gutter pt-5 pb-2"
            />
        </header>
    );
}
