// What a form can change in the auth frame while the reader moves through its steps: the heading and the frame links.
// The page renders the defaults on the server; a form swaps in its own and the defaults return when it unmounts.

import 'client-only';
import { createContext, use, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Heading } from '../headings';

export type SwitchLinkTarget = { prompt?: string; label: string; href: string; onClick?: () => void };

export type FrameLinks = { switchLink: SwitchLinkTarget | null; guestLink: boolean };

export const StepHeadingSetterContext = createContext<Dispatch<SetStateAction<Heading | null>> | null>(null);

export const StepHeadingContext = createContext<Heading | null>(null);

export const FrameLinksSetterContext = createContext<Dispatch<SetStateAction<FrameLinks | null>> | null>(null);

export const FrameLinksContext = createContext<FrameLinks | null>(null);

export const DescriptionIdContext = createContext<string | undefined>(undefined);

// Pass a module constant or a memoized value (null keeps the page's default): a new object every render re-runs the effect.
export function useAuthHeading(heading: Heading | null) {
    const setStep = use(StepHeadingSetterContext);

    useEffect(() => {
        if (!setStep || !heading)
            return;

        setStep(heading);

        return () => setStep(null);
    }, [setStep, heading]);
}

// Pass a module constant (null keeps the page's links), for the same reason as useAuthHeading.
export function useAuthFrameLinks(links: FrameLinks | null) {
    const setLinks = use(FrameLinksSetterContext);

    useEffect(() => {
        if (!setLinks || !links)
            return;

        setLinks(links);

        return () => setLinks(null);
    }, [setLinks, links]);
}

// For a field's aria-describedby, so landing in it also reads the step's description.
export function useAuthDescriptionId(): string | undefined {
    return use(DescriptionIdContext);
}
