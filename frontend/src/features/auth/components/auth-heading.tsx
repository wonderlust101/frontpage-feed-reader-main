'use client';

// The parts of an auth page that follow the reader's step. The page renders the defaults on the server; a form that
// moves on in the browser swaps in its own heading and frame links, and the defaults return when it unmounts.

import { createContext, use, useEffect, useId, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { TextLink } from '@/components/ui/text-link';
import type { Heading, PanelText } from '../headings';

export type SwitchLinkTarget = { prompt?: string; label: string; href: string; onClick?: () => void };

export type FrameLinks = { switchLink: SwitchLinkTarget | null; guestLink: boolean };

const HeadingContext = createContext<Dispatch<SetStateAction<Heading | null>> | null>(null);

const StepHeadingContext = createContext<Heading | null>(null);

const FrameLinksSetterContext = createContext<Dispatch<SetStateAction<FrameLinks | null>> | null>(null);

const FrameLinksContext = createContext<FrameLinks | null>(null);

const DescriptionIdContext = createContext<string | undefined>(undefined);

export function AuthHeadingProvider({ children }: { children: ReactNode }) {
    const [step, setStep] = useState<Heading | null>(null);
    const [links, setLinks] = useState<FrameLinks | null>(null);
    const descriptionId = useId();

    return (
        <HeadingContext value={setStep}>
            <StepHeadingContext value={step}>
                <FrameLinksSetterContext value={setLinks}>
                    <FrameLinksContext value={links}>
                        <DescriptionIdContext value={descriptionId}>{children}</DescriptionIdContext>
                    </FrameLinksContext>
                </FrameLinksSetterContext>
            </StepHeadingContext>
        </HeadingContext>
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
        <div aria-hidden className="mt-7 max-lg:[@media(max-height:40em)]:mt-4 lg:my-auto lg:pb-[6cqi]">
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

    if (links?.switchLink === null)
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

    if (!(links?.guestLink ?? show))
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

// null keeps the page's default heading.
export function useAuthHeading(heading: Heading | null) {
    const setStep = use(HeadingContext);
    const title = heading?.title;
    const description = heading?.description;
    const panelHeadline = heading?.panel?.headline;
    const panelLine = heading?.panel?.line;

    useEffect(() => {
        if (!setStep || title === undefined || description === undefined)
            return;

        const panel = panelHeadline !== undefined && panelLine !== undefined ? { headline: panelHeadline, line: panelLine } : undefined;

        setStep({ title, description, panel });

        return () => setStep(null);
    }, [setStep, title, description, panelHeadline, panelLine]);
}

// For a field's aria-describedby, so landing in it also reads the step's description.
export function useAuthDescriptionId(): string | undefined {
    return use(DescriptionIdContext);
}

// Pass a stable `onClick` (e.g. a module constant): a new one on every render resets the links.
export function useAuthFrameLinks(links: FrameLinks | null) {
    const setLinks = use(FrameLinksSetterContext);
    const active = links !== null;
    const hidesSwitch = links?.switchLink === null;
    const prompt = links?.switchLink?.prompt;
    const label = links?.switchLink?.label;
    const href = links?.switchLink?.href;
    const onClick = links?.switchLink?.onClick;
    const guestLink = links?.guestLink;

    useEffect(() => {
        if (!setLinks || !active || guestLink === undefined)
            return;

        const switchLink = hidesSwitch || label === undefined || href === undefined ? null : { prompt, label, href, onClick };

        setLinks({ switchLink, guestLink });

        return () => setLinks(null);
    }, [setLinks, active, hidesSwitch, prompt, label, href, onClick, guestLink]);
}
