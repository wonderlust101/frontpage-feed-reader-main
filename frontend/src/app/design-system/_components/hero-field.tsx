'use client';

import { Logo } from '@/components/logo';
import { Stickers } from '@/components/stickers';
import { useCategoryFields } from '@/features/categories/category-field-store';
import { BRAND_FIELD } from '@/features/categories/fields';
import { ReaderSettings } from '@/features/preferences/components/reader-settings';
import { CATEGORIES, CATEGORY_IDS, CATEGORY_PRESETS } from '../_data/sample-data';
import { SECTIONS } from '../_data/sections';
import { HERO_STICKERS } from '../_data/hero-stickers';
import { useHeroChoice } from './hero-choice';

const SOURCE_COUNT = CATEGORIES.reduce((total, category) => total + category.sources.length, 0);

export function HeroField() {
    const { choice } = useHeroChoice();
    const [fields] = useCategoryFields(CATEGORY_IDS, CATEGORY_PRESETS);
    const category = CATEGORIES.find((candidate) => candidate.id === choice);
    const field = category ? fields[category.id].color : BRAND_FIELD.color;
    const caption = category
        ? `${category.name} · ${category.sources.join(', ')}`
        : `All categories · ${SOURCE_COUNT} sources in ${CATEGORIES.length} categories`;

    return (
        <header className="hero-field relative" style={{ color: field }}>
            <div className="sticker-field bg-current">
                <div className="hero-field-ink on-field mx-auto max-w-page px-gutter pb-12" style={{ color: 'var(--color-on-field)' }}>
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
                            <ReaderSettings />
                        </div>
                    </div>

                    <div className="mt-[clamp(1.5rem,5vw,4.5rem)] gap-x-[clamp(2rem,4vw,5rem)] lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
                        <div>
                            <h1 className="type-specimen">
                                <span className="sr-only">Frontpage design system: </span>
                                Type leads.
                                <br />
                                Color maps.
                            </h1>
                            <p className="mt-8 max-w-[34rem] text-body leading-[1.55] font-medium">
                                Every token and component on this page is live. Pick a category to recolor this field, or open Aa to tune the reading settings
                                and the theme.
                            </p>
                        </div>
                        <div className="relative hidden aspect-[4/3] lg:block">
                            <Stickers stickers={HERO_STICKERS} className="stickers-pile" />
                        </div>
                    </div>
                    <p className="mt-6 text-meta font-semibold lg:ml-auto lg:text-right">{caption}</p>
                </div>
            </div>
        </header>
    );
}
