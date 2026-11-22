'use client';

// The auth page's h1 and description, which follow the step the reader is on. The page sets the default (from the
// server, so it is right before any script runs); a form that moves to another step in the browser ("Check your
// inbox", "Password changed") swaps in its own heading with useAuthHeading, and the default returns when it unmounts.

import { createContext, use, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

export type Heading = { title: string; description: string };

const HeadingContext = createContext<Dispatch<SetStateAction<Heading | null>> | null>(null);

const StepHeadingContext = createContext<Heading | null>(null);

// Holds the step heading for everything inside it (the frame wraps the whole page in it).
export function AuthHeadingProvider({ children }: { children: ReactNode }) {
    const [step, setStep] = useState<Heading | null>(null);

    return (
        <HeadingContext value={setStep}>
            <StepHeadingContext value={step}>{children}</StepHeadingContext>
        </HeadingContext>
    );
}

// Renders the h1 (with its Lemon underline) and description: the current step's, else the page's default.
export function AuthHeading({ title, description }: Heading) {
    const heading = use(StepHeadingContext) ?? { title, description };

    return (
        <>
            <h1 className="type-headline text-[clamp(2rem,1.4rem+1.4vw,2.75rem)]">
                <span className="underline decoration-(--color-field-lemon) decoration-[0.16em] underline-offset-[0.14em] [text-decoration-skip-ink:none]">
                    {heading.title}
                </span>
            </h1>
            <p className="mt-3 [overflow-wrap:anywhere] text-ink-2">{heading.description}</p>
        </>
    );
}

// Shows `heading` in place of the page's default while the calling component is mounted with it; null keeps the default.
export function useAuthHeading(heading: Heading | null) {
    const setStep = use(HeadingContext);
    const title = heading?.title;
    const description = heading?.description;

    useEffect(() => {
        if (!setStep || title === undefined || description === undefined) {
            return;
        }
        setStep({ title, description });
        return () => setStep(null);
    }, [setStep, title, description]);
}
