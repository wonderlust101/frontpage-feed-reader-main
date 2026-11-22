// The frame every auth page shares: the full screen split in two. Left, the form under the page's h1; right, a Lemon
// panel framed by stickers (the page's own set, from _data/panels.ts) with a display headline. On phones the
// panel becomes a short band above the form and keeps only its right-edge stickers. The logo sits top-left with the
// form (its wordmark follows the theme's ink); on phones it moves into the band, which comes first. On desktop the
// panel is a rounded container inset from the screen's edges; the stickers are clipped by its corners.
// The logo, headline and flavour line under it have no plate: the sticker slots keep well clear of all three. The
// flavour line is header-like (display face, a step below the headline) and capped at 62cqi, so the right-edge
// stickers never come near it. On desktop the headline and its line sit together in the panel's vertical middle
// (nudged a little above it, so the heavier bottom stickers keep their distance). It balances its lines inline, since the global paragraph wrap outranks utilities.
// The form column is framed top and bottom: logo and the page-switch link above, the guest shortcut below (signed-in pages skip it).
// One quiet brand touch on the form side: a Lemon underline on the h1.

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
            <a href="#main" className="sr-only focus:not-sr-only">
                Skip to form
            </a>
            <div className="grid w-full lg:min-h-dvh lg:grid-cols-2">
                <section
                    aria-label="Frontpage"
                    className="sticker-field on-field relative flex flex-col overflow-hidden text-on-field lg:order-2 lg:m-4 lg:ml-0 lg:rounded-stage"
                    style={fieldStyle}
                >
                    <Stickers stickers={panel.stickers} className="stickers-wobble" />
                    <div className="relative flex flex-1 flex-col px-gutter pt-6 pb-9 lg:p-14">
                        <Link href="/" className="w-fit rounded-toggle lg:hidden">
                            <Logo size="md" variant="ink" />
                        </Link>
                        <div className="mt-10 lg:my-auto lg:pb-[6cqi]">
                            <p className="type-display text-[clamp(2.75rem,13cqi,6.5rem)] whitespace-pre-line">{panel.headline}</p>
                            <p
                                className="mt-5 max-w-[62cqi] font-display text-[clamp(1.25rem,4.2cqi,2.125rem)] leading-[1.15] font-semibold tracking-[-0.015em]"
                                style={{ textWrap: 'balance' }}
                            >
                                {panel.line}
                            </p>
                        </div>
                    </div>
                </section>

                <main
                    id="main"
                    tabIndex={-1}
                    className="relative flex flex-col bg-ground px-gutter pt-10 pb-8 lg:px-[clamp(2.5rem,5vw,6rem)] lg:pt-10"
                >
                    <div className="hidden items-center justify-between gap-6 lg:flex">
                        <Link href="/" className="w-fit rounded-toggle text-ink">
                            <Logo size="md" />
                        </Link>
                        <SwitchLink aside={aside} />
                    </div>
                    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center lg:py-12">
                        <h1 className="type-headline text-[clamp(2rem,1.4rem+1.4vw,2.75rem)]">
                            <span className="underline decoration-(--color-field-lemon) decoration-[0.16em] underline-offset-[0.14em] [text-decoration-skip-ink:none]">
                                {title}
                            </span>
                        </h1>
                        <p className="mt-3 text-ink-2">{description}</p>
                        <div className="mt-8">{children}</div>
                        <div className="mt-10 text-center lg:hidden">
                            <SwitchLink aside={aside} />
                        </div>
                    </div>
                    {panel.guestLink && (
                        <div className="mt-10 border-t border-rule-soft pt-5 text-ink-2">
                            <p className="text-ui">
                                Just looking?{' '}
                                <Link href="/guest" className={`text-ink ${LINK_CLASSES}`}>
                                    Read as a guest
                                </Link>
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

// Renders the "New to Frontpage? Create an account" style link that switches between the auth pages.
function SwitchLink({ aside }: Pick<AuthFrameProps, 'aside'>) {
    return (
        <p className="text-ui text-ink-2">
            {aside.prompt && <>{aside.prompt} </>}
            <Link href={aside.href} className={`text-ink ${LINK_CLASSES}`}>
                {aside.label}
            </Link>
        </p>
    );
}
