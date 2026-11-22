'use client';

// The design system page's hero: a full-width color field whose coastline edge carries the category capsules.
// Choosing a capsule recolors the field, which is the system's rule in action: one category, one field.
// The capsules wrap rather than scroll, so every category stays reachable however many a reader has. Category colors
// come from the guest's saved choices (the Color section's picker), else each sample category's preset.

import { useState } from 'react';
import { Coastline } from '@/components/coastline';
import { Logo } from '@/components/logo';
import { useCategoryFields } from '@/features/categories/category-field-store';
import { CategorySwitch } from '@/features/categories/components/category-switch';
import { BRAND_FIELD } from '@/features/categories/fields';
import { ThemeSwitch } from '@/features/preferences/components/theme-switch';
import { CATEGORIES, CATEGORY_PRESETS } from '../_data/sample-data';
import { SECTIONS } from '../_data/sections';

const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

const SOURCE_COUNT = CATEGORIES.reduce((total, category) => total + category.sources.length, 0);

// Renders the field with its top bar, specimen headline, live caption and the capsules riding the coast.
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
        <header className="hero-field relative" style={{ color: field }}>
            <div className="bg-current">
                <div className="hero-field-ink on-field mx-auto max-w-page px-gutter pb-8" style={{ color: 'var(--color-on-field)' }}>
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-5">
                        <a href="#main" className="sr-only focus:not-sr-only">
                            Skip to content
                        </a>
                        <p className="flex items-baseline gap-3">
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
                        <div className="ml-auto">
                            <ThemeSwitch contrast={field} />
                        </div>
                    </div>

                    <h1 className="mt-[clamp(1.5rem,5vw,4.5rem)] type-specimen">
                        <span className="sr-only">Frontpage design system: </span>
                        Type leads.
                        <br />
                        Color maps.
                    </h1>
                    <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,34rem)_1fr] md:items-end">
                        <p className="text-body leading-[1.55] font-medium">
                            Every token and component on this page is live. Pick a category to recolor this field, tune the reading controls, switch the theme.
                        </p>
                        <p className="text-meta font-semibold md:text-right">{caption}</p>
                    </div>
                </div>
            </div>

            <Coastline className="h-[clamp(3.5rem,9vw,8.5rem)]" />

            <CategorySwitch
                label="Color the field by category"
                options={viewOptions}
                value={choice}
                onChange={setChoice}
                className="relative mx-auto -mt-[clamp(2.75rem,5.5vw,5.75rem)] max-w-page px-gutter py-2 lg:justify-end"
            />
        </header>
    );
}
