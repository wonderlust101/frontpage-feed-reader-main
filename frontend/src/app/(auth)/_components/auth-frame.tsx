// The frame every auth page shares: a Lemon band (Frontpage's own field) with the logo, one page-specific link and
// the page headline, ending in the coastline, which opens the form column below it (no extra rule: a form's error
// notice brings its own). The headline and the form share one centered column so their left edges line up.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Coastline } from '@/components/coastline';
import { Logo } from '@/components/logo';
import { BRAND_FIELD } from '@/features/categories/fields';

type AuthFrameProps = {
    title: string;
    intro: ReactNode;
    aside: { prompt?: string; label: string; href: string };
    children: ReactNode;
};

// Renders the band, headline and intro, then `children` (the form or a result message) in the form column.
export function AuthFrame({ title, intro, aside, children }: AuthFrameProps) {
    return (
        <div className="flex flex-1 flex-col">
            <header style={{ color: BRAND_FIELD.color }}>
                <div className="bg-current">
                    <div className="on-field mx-auto max-w-page px-gutter pb-2" style={{ color: 'var(--color-on-field)' }}>
                        <a href="#main" className="sr-only focus:not-sr-only">
                            Skip to form
                        </a>
                        <nav aria-label="Account" className="flex items-center justify-between gap-4 py-5">
                            <Link href="/" className="rounded-toggle">
                                <Logo size="md" variant="ink" />
                            </Link>
                            <p className="text-ui">
                                {aside.prompt && <span className="hidden sm:inline">{aside.prompt} </span>}
                                <Link href={aside.href} className="font-semibold underline decoration-1 underline-offset-4 hover:decoration-2">
                                    {aside.label}
                                </Link>
                            </p>
                        </nav>
                        <div className="mx-auto max-w-2xl pt-[clamp(1rem,4vw,3rem)]">
                            <h1 className="type-display">{title}</h1>
                            <p className="mt-4 max-w-xl text-body leading-[1.5] font-medium">{intro}</p>
                        </div>
                    </div>
                </div>
                <Coastline className="h-[clamp(2.5rem,6vw,5rem)]" />
            </header>

            <main id="main" tabIndex={-1} className="mx-auto w-full max-w-page px-gutter pt-6 pb-24 outline-none">
                <div className="mx-auto max-w-2xl">
                    <div className="max-w-md pt-4">{children}</div>
                </div>
            </main>
        </div>
    );
}
