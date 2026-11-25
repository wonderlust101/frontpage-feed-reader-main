// The frame every auth page shares: the form column and a Lemon sticker panel (a short band above the form on phones).
// The panel is the page's <header>, so the phone logo link sits in a landmark; "Skip to form" lands on the h1.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { Stickers } from '@/components/stickers';
import { SkipLink } from '@/components/ui/skip-link';
import { AuthGuestLink, AuthStepProvider, AuthPanelText, AuthSwitchLink } from '@/features/auth/components/auth-step-frame';
import type { SwitchLinkTarget } from '@/features/auth/hooks/use-auth-step';
import { BRAND_FIELD } from '@/features/categories/fields';
import type { AuthPanel } from '../_data/panels';

type AuthFrameProps = {
    panel: AuthPanel;
    panelText?: ReactNode;
    heading: ReactNode;
    aside: SwitchLinkTarget;
    children: ReactNode;
};

// `heading` and `panelText` may be <Suspense> wrappers, for a page that picks them from the URL.
export function AuthFrame({ panel, panelText, heading, aside, children }: AuthFrameProps) {
    return (
        <AuthStepProvider>
            <div className="flex flex-1">
                <SkipLink href="#form" className="focus:top-4 focus:left-4">
                    Skip to form
                </SkipLink>
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
        </AuthStepProvider>
    );
}
