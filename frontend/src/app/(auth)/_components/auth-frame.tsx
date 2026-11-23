// The frame every auth page shares: the full screen split in two. Left, the form under the page's h1; right, a Lemon
// panel framed by stickers (the page's own set, from _data/panels.ts) with a display headline. On phones the
// panel becomes a short band above the form, with a top-right sticker and a small cluster along its bottom edge. The logo sits top-left with the
// form (its wordmark follows the theme's ink); on phones it moves into the band, which comes first. On desktop the
// panel is a rounded container inset from the screen's edges; the stickers are clipped by its corners.
// The logo, headline and flavour line under it have no plate: the sticker slots keep well clear of all three. The
// flavour line is header-like (display face, a step below the headline) and capped at 62cqi, so the right-edge
// stickers never come near it. On desktop the headline and its line sit together in the panel's vertical middle
// (nudged a little above it, so the heavier bottom stickers keep their distance). It balances its lines inline, since the global paragraph wrap outranks utilities.
// The h1 and description, the panel's headline and line, and the switch and guest links follow the reader's step
// (auth-heading.tsx): the page passes the defaults, and a form that moves on in the browser swaps in its own.
// The panel is the page's header: on phones it holds the logo link (so that link sits in a landmark); its text is
// hidden from screen readers (the h1 says what the page is for), so they meet the logo and then the form. "Skip to form" lands on the h1, past the top bar.
// Between lg and xl the form column takes a little more width than the panel,
// and the switch link never wraps, so the top bar keeps to one line, and the panel headline is capped so the h1 stays the start of the task.
// The form column is framed top and bottom: logo and the page-switch link above, the guest shortcut below (signed-in pages skip it).
// One quiet brand touch on the form side: a Lemon underline on the h1.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { Stickers } from '@/components/stickers';
import { AuthGuestLink, AuthHeadingProvider, AuthPanelText, AuthSwitchLink, type SwitchLinkTarget } from '@/features/auth/components/auth-heading';
import { BRAND_FIELD } from '@/features/categories/fields';
import type { AuthPanel } from '../_data/panels';

type AuthFrameProps = {
    panel: AuthPanel;
    panelText?: ReactNode;
    heading: ReactNode;
    aside: SwitchLinkTarget;
    children: ReactNode;
};

// Renders the sticker panel and the form column. `heading` is the page's AuthHeading (or a <Suspense> around one, for
// a page that picks its heading from the URL), and `panelText` likewise replaces the panel's default text when the URL
// decides the mood; `children` is the form (or a result message) under it.
export function AuthFrame({ panel, panelText, heading, aside, children }: AuthFrameProps) {
    return (
        <AuthHeadingProvider>
            <div className="flex flex-1">
                <a
                    href="#form"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-ink focus:px-5 focus:py-3 focus:text-ui focus:font-semibold focus:text-ground"
                >
                    Skip to form
                </a>
                <div className="grid w-full lg:min-h-dvh lg:grid-cols-[1.15fr_1fr] xl:grid-cols-2">
                    <header
                        className="sticker-field on-field relative flex flex-col overflow-hidden text-on-field lg:order-2 lg:m-4 lg:ml-0 lg:rounded-stage"
                        style={{ background: BRAND_FIELD.color }}
                    >
                        <Stickers stickers={panel.stickers} className="stickers-wobble" />
                        <div className="relative flex flex-1 flex-col px-gutter pt-5 pb-8 lg:p-14">
                            <Link href="/" className="w-fit rounded-toggle lg:hidden">
                                <Logo size="md" variant="ink" />
                            </Link>
                            {panelText ?? <AuthPanelText headline={panel.headline} line={panel.line} />}
                        </div>
                    </header>

                    <main id="main" tabIndex={-1} className="relative flex flex-col bg-ground px-gutter pt-8 pb-8 lg:px-[clamp(2rem,4.5vw,6rem)] lg:pt-10">
                        <div className="hidden items-center justify-between gap-6 lg:flex">
                            <Link href="/" className="w-fit rounded-toggle text-ink">
                                <Logo size="md" />
                            </Link>
                            <AuthSwitchLink target={aside} />
                        </div>
                        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center lg:py-10">
                            <div id="form" tabIndex={-1} className="outline-none">
                                {heading}
                            </div>
                            <div className="mt-7 lg:mt-8">{children}</div>
                            <div className="mt-10 text-center lg:hidden">
                                <AuthSwitchLink target={aside} />
                            </div>
                        </div>
                        <AuthGuestLink show={panel.guestLink} />
                    </main>
                </div>
            </div>
        </AuthHeadingProvider>
    );
}
