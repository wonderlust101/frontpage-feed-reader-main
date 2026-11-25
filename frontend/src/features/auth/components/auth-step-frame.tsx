'use client';

// The auth frame's parts that follow the reader's step (heading, panel text, frame links); hooks/use-auth-step.ts
// is how a form changes them.

import { use, useId, useState, type ReactNode } from 'react';
import { TextLink } from '@/components/ui/text-link';
import type { Heading, PanelText } from '../headings';
import {
    DescriptionIdContext,
    FrameLinksContext,
    FrameLinksSetterContext,
    StepHeadingContext,
    StepHeadingSetterContext,
    type FrameLinks,
    type SwitchLinkTarget,
} from '../hooks/use-auth-step';

export function AuthStepProvider({ children }: { children: ReactNode }) {
    const [step, setStep] = useState<Heading | null>(null);
    const [links, setLinks] = useState<FrameLinks | null>(null);
    const descriptionId = useId();

    return (
        <StepHeadingSetterContext value={setStep}>
            <StepHeadingContext value={step}>
                <FrameLinksSetterContext value={setLinks}>
                    <FrameLinksContext value={links}>
                        <DescriptionIdContext value={descriptionId}>{children}</DescriptionIdContext>
                    </FrameLinksContext>
                </FrameLinksSetterContext>
            </StepHeadingContext>
        </StepHeadingSetterContext>
    );
}

export function AuthHeading({ title, description }: Heading) {
    const step = use(StepHeadingContext);
    const descriptionId = use(DescriptionIdContext);
    const heading = step ?? { title, description };

    return (
        <>
            <h1 className="type-headline text-[clamp(2rem,1.4rem+1.4vw,2.75rem)]" style={{ textWrap: 'balance' }}>
                <span className="underline decoration-(--color-field-lemon) decoration-[0.16em] underline-offset-[0.14em] [text-decoration-skip-ink:none]">
                    {heading.title}
                </span>
            </h1>
            <p id={descriptionId} className="mt-3 [overflow-wrap:anywhere] text-ink-2">
                {heading.description}
            </p>
        </>
    );
}

// Hidden from screen readers: it is the page's mood, and the h1 and description already say what to do.
export function AuthPanelText({ headline, line }: PanelText) {
    const step = use(StepHeadingContext);
    const text = step?.panel ?? { headline, line };

    return (
        <div aria-hidden="true" className="mt-7 max-lg:[@media(max-height:40em)]:mt-4 lg:my-auto lg:pb-[6cqi]">
            <p className="type-display text-[clamp(2.75rem,10cqi,3.75rem)] whitespace-pre-line max-lg:[@media(max-height:40em)]:text-[2rem]">{text.headline}</p>
            <p
                className="mt-3 max-w-[62cqi] font-display text-[clamp(1.25rem,4.2cqi,2.125rem)] leading-[1.15] font-semibold tracking-[-0.015em] max-lg:[@media(max-height:40em)]:hidden lg:mt-5"
                style={{ textWrap: 'balance' }}
            >
                {text.line}
            </p>
        </div>
    );
}

export function AuthSwitchLink({ target }: { target: SwitchLinkTarget }) {
    const links = use(FrameLinksContext);
    // A form sets switchLink to null to hide the link; undefined (no form override) keeps the page's own.
    const isHidden = links?.switchLink === null;

    if (isHidden)
        return null;

    const link = links?.switchLink ?? target;

    return (
        <p className="text-ui text-ink-2 lg:whitespace-nowrap">
            {link.prompt && <>{link.prompt} </>}
            <TextLink href={link.href} className="text-ink" onClick={link.onClick}>
                {link.label}
            </TextLink>
        </p>
    );
}

export function AuthGuestLink({ show }: { show: boolean }) {
    const links = use(FrameLinksContext);
    const isVisible = links?.guestLink ?? show;

    if (!isVisible)
        return null;

    return (
        <div className="mt-8 border-t border-rule-soft pt-5 text-ink-2 lg:mt-10">
            <p className="text-ui">
                Just looking?{' '}
                <TextLink href="/guest" className="text-ink">
                    Read as a guest
                </TextLink>
            </p>
        </div>
    );
}
