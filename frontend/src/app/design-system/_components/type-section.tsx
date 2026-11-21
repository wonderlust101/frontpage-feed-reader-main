// Type section of the design system page: every role at its real size next to its spec.

import { DocSection } from './doc-section';

const TYPE_ROLES = [
    {
        role: 'Specimen',
        spec: 'Bricolage Grotesque 700 · 4–11rem · 0.9 · −0.04em',
        sample: 'Type leads.',
        className: "font-display text-[4rem] leading-[0.9] font-bold tracking-[-0.04em] [font-variation-settings:'opsz'_96]",
    },
    {
        role: 'Display',
        spec: 'Bricolage Grotesque 700 · 2.75–4.5rem · 0.95 · −0.035em',
        sample: 'Section opener',
        className: 'type-display',
    },
    {
        role: 'Headline',
        spec: 'Bricolage Grotesque 600 · 2rem · 1.1 · −0.02em',
        sample: 'Container queries in practice',
        className: 'type-headline',
    },
    {
        role: 'Title',
        spec: 'Bricolage Grotesque 600 · 1.375rem · 1.2 · −0.015em',
        sample: 'Notes on running small models locally for code review',
        className: 'type-title font-semibold',
    },
    {
        role: 'Body',
        spec: 'Reading face · follows the reading controls · 66ch',
        sample: 'Frontpage keeps the reading column calm: one face, a real measure and line height you choose yourself.',
        className: 'max-w-measure type-body',
    },
    {
        role: 'UI',
        spec: 'Onest 500–600 · 0.9375rem · 1.45',
        sample: 'Add feed · Import OPML · Mark all as read',
        className: 'text-ui font-semibold',
    },
    {
        role: 'Meta',
        spec: 'Onest 400 · 0.8125rem · tabular figures',
        sample: '09:42 · 23 new · 19 sources',
        className: 'text-meta tabular-nums text-muted',
    },
];

// Renders the type section: every role at its real size next to its spec.
export function TypeSection() {
    return (
        <DocSection
            id="type"
            title="Type"
            intro="Bricolage Grotesque sets everything you scan: headlines, section openers, item titles. Onest sets everything you read and operate. The body face is yours to change, so the reading controls retune every body sample on this page."
        >
            <dl className="mt-10 rule-t">
                {TYPE_ROLES.map((type) => (
                    <div key={type.role} className="grid gap-3 border-b border-rule-soft py-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8">
                        <dt>
                            <span className="block text-ui font-semibold">{type.role}</span>
                            <span className="mt-1 block text-meta text-muted">{type.spec}</span>
                        </dt>
                        <dd className={`min-w-0 ${type.className}`}>{type.sample}</dd>
                    </div>
                ))}
            </dl>
        </DocSection>
    );
}
