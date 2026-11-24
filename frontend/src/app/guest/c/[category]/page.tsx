// A guest category's page, one per curated category, prerendered at build time (an unknown id is a 404). Placeholder
// content like /guest itself: the feed list arrives with the items. Its title carries the category's field as an
// underline, the page end of the shell's colour thread. The part that reads the URL's params sits in <Suspense>, so a
// navigation between categories is instant (the static shell paints first) rather than waiting on the params.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { GUEST_CATEGORIES, guestCategoryColor } from '@/features/categories/guest-categories';

// Returns one path per guest category, so every category page is static.
export function generateStaticParams() {
    return GUEST_CATEGORIES.map((category) => ({ category: category.id }));
}

// Titles the page with the category's name.
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

// Renders the category's heading and sources from the URL's id; an unknown id is a 404.
async function GuestCategory({ params }: Pick<PageProps<'/guest/c/[category]'>, 'params'>) {
    const { category: id } = await params;
    const category = GUEST_CATEGORIES.find((entry) => entry.id === id);
    if (!category) {
        notFound();
    }

    return (
        <>
            <h1
                className="self-start type-headline underline decoration-[0.12em] underline-offset-[0.16em] [text-decoration-skip-ink:none]"
                style={{ textDecorationColor: guestCategoryColor(category) }}
            >
                {category.name}
            </h1>
            <p>Articles from {category.sources.join(', ')} will load here.</p>
        </>
    );
}
