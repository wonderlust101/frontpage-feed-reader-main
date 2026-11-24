// Prerendered per guest category. The part that reads params sits in <Suspense>, so moving between categories is instant.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense, type CSSProperties } from 'react';
import { categoryColor } from '@/features/categories/category-field-vars';
import { fieldOrNone } from '@/features/categories/fields';
import { GUEST_CATEGORIES } from '@/features/categories/guest-categories';

export function generateStaticParams() {
    return GUEST_CATEGORIES.map((category) => ({ category: category.id }));
}

export async function generateMetadata({ params }: PageProps<'/guest/c/[category]'>): Promise<Metadata> {
    const { category: id } = await params;

    return { title: GUEST_CATEGORIES.find((category) => category.id === id)?.name ?? 'Guest' };
}

export default function GuestCategoryPage({ params }: PageProps<'/guest/c/[category]'>) {
    return (
        <div className="mx-auto flex w-full max-w-page flex-col gap-4 px-gutter py-12">
            <Suspense>
                <GuestCategory params={params} />
            </Suspense>
        </div>
    );
}

async function GuestCategory({ params }: Pick<PageProps<'/guest/c/[category]'>, 'params'>) {
    const { category: id } = await params;
    const category = GUEST_CATEGORIES.find((entry) => entry.id === id);

    if (!category)
        notFound();

    return (
        <>
            <h1
                className="field-underline self-start type-headline underline decoration-[0.12em] underline-offset-[0.16em] [text-decoration-skip-ink:none]"
                style={{ '--title-field': categoryColor(category.id, fieldOrNone(category.preset).color) } as CSSProperties}
            >
                {category.name}
            </h1>
            <p>Articles from {category.sources.join(', ')} will load here.</p>
        </>
    );
}
