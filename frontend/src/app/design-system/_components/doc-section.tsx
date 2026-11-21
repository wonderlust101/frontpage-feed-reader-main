// Shared building blocks for design system sections: the section shell with its opener, and a titled specimen block.

import type { ReactNode } from 'react';

type DocSectionProps = {
    id: string;
    title: string;
    intro: string;
    children: ReactNode;
};

type SpecimenStage = 'panel' | 'frame' | 'none';

type SpecimenProps = {
    title: string;
    description?: string;
    stage?: SpecimenStage;
    children: ReactNode;
    className?: string;
};

const STAGE_CLASSES: Record<SpecimenStage, string> = {
    panel: 'mt-6 flex-1 rounded-[14px] border border-ink/15 bg-ground-2 p-6 md:p-8',
    frame: 'mt-6 flex-1 rounded-[14px] border border-ink/15 bg-ground p-6 md:p-8',
    none: 'mt-6',
};

// Renders a page section: a 2px ink rule, a display heading, a reading-face intro, then the section's content.
export function DocSection({ id, title, intro, children }: DocSectionProps) {
    return (
        <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t-2 border-rule pt-8 pb-24">
            <h2 id={`${id}-title`} className="font-display text-display leading-[0.95] font-bold tracking-[-0.035em] [font-variation-settings:'opsz'_96]">
                {title}
            </h2>
            <p className="mt-5 max-w-measure font-reading text-body leading-[var(--leading-body)] text-ink-2">{intro}</p>
            <div className="mt-14 flex flex-col gap-14">{children}</div>
        </section>
    );
}

// Renders one specimen inside a section: a headline, an optional description and the live example on its stage.
// Stages: "panel" (tinted, for controls), "frame" (plain ground, for examples that hold tinted panels), "none" (ruled lists).
export function Specimen({ title, description, stage = 'panel', children, className = '' }: SpecimenProps) {
    return (
        <div className={`flex min-w-0 flex-col ${className}`}>
            <h3 className="font-display text-headline leading-[1.1] font-semibold tracking-[-0.02em]">{title}</h3>
            {description && <p className="mt-2 max-w-measure text-ui text-ink-2">{description}</p>}
            <div className={STAGE_CLASSES[stage]}>{children}</div>
        </div>
    );
}
