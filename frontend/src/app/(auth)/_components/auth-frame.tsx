// The frame every auth page shares: the full screen split in two. Left, a Lemon panel framed by stickers (the
// page's own set, from _data/panels.ts) with a display headline; right, the form under the page's h1. On phones the
// panel becomes a short band above the form and keeps only its right-edge stickers.
// The logo and headline have no plate: the sticker slots keep well clear of them. The supporting line and the guest
// link sit in a sticker note (a real container of sticker paper), which a sticker may tuck under.

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { Stickers } from '@/components/stickers';
import { BRAND_FIELD } from '@/features/categories/fields';
import type { AuthPanel } from '../_data/panels';

type AuthFrameProps = {
    panel: AuthPanel;
    title: string;
    description: string;
    aside: { prompt?: string; label: string; href: string };
    children: ReactNode;
};

const LINK_CLASSES = 'font-semibold underline decoration-1 underline-offset-4 hover:decoration-2';

// Renders the sticker panel and the form column; `children` is the form (or a result message) under the h1.
export function AuthFrame({ panel, title, description, aside, children }: AuthFrameProps) {
    const fieldStyle = { background: BRAND_FIELD.color } as CSSProperties;

    return (
        <div className="flex flex-1">
            <div className="grid w-full lg:min-h-dvh lg:grid-cols-2">
                <section aria-label="Frontpage" className="sticker-field on-field relative flex flex-col text-on-field" style={fieldStyle}>
                    <Stickers stickers={panel.stickers} className="stickers-wobble" />
                    <div className="relative flex flex-1 flex-col px-gutter pt-6 pb-9 lg:p-14">
                        <a href="#main" className="sr-only focus:not-sr-only">
                            Skip to form
                        </a>
                        <Link href="/" className="w-fit rounded-toggle">
                            <Logo size="md" variant="ink" />
                        </Link>
                        <p className="mt-10 type-display text-[clamp(2.75rem,13cqi,6.5rem)] whitespace-pre-line lg:mt-[14cqi]">{panel.headline}</p>
                        <div className="sticker-note mt-8 flex flex-col gap-1.5 lg:mt-auto lg:mb-[34cqi]">
                            <p className="max-w-[22rem] text-ui font-medium">{panel.line}</p>
                            {panel.guestLink && (
                                <Link href="/guest" className={`w-fit text-ui ${LINK_CLASSES}`}>
                                    Read as a guest
                                </Link>
                            )}
                        </div>
                    </div>
                </section>

                <main id="main" tabIndex={-1} className="flex flex-col bg-ground px-gutter pt-10 pb-12 outline-none lg:px-[clamp(2.5rem,5vw,6rem)] lg:py-16">
                    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:justify-center">
                        <h1 className="type-headline">{title}</h1>
                        <p className="mt-3 text-ink-2">{description}</p>
                        <div className="mt-8">{children}</div>
                        <p className="mt-auto pt-10 text-center text-ui text-ink-2 lg:mt-0">
                            {aside.prompt && <>{aside.prompt} </>}
                            <Link href={aside.href} className={`text-ink ${LINK_CLASSES}`}>
                                {aside.label}
                            </Link>
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
