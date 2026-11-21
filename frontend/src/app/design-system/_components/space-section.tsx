// Space and shape section of the design system page: the spacing scale, density, and the three shapes the system uses.

import { Button } from '@/components/ui/button';
import { DocSection, Specimen } from './doc-section';

const SPACE_STEPS = [4, 8, 12, 16, 24, 32, 48, 64, 96];

// Renders the space and shape section: the spacing scale, density, and the three shapes the system uses.
export function SpaceSection() {
    return (
        <DocSection
            id="space"
            title="Space and shape"
            intro="Space follows a 4px base. Density multiplies the padding between items, so compact lists fit more on screen without shrinking any type. Shapes are few: softly rounded controls, square fields for color, rules for rows."
        >
            <div className="grid gap-14 xl:grid-cols-2 xl:gap-x-10">
                <Specimen title="Spacing scale">
                    <ul className="space-y-2">
                        {SPACE_STEPS.map((step) => (
                            <li key={step} className="grid grid-cols-[4rem_1fr] items-center gap-4 text-meta tabular-nums">
                                <span className="text-ink-2">{step}px</span>
                                <span className="block h-3 bg-ink" style={{ width: `${(step / 96) * 100}%` }} />
                            </li>
                        ))}
                    </ul>
                </Specimen>

                <Specimen title="Density" description="Set with the reading controls above. Rows below use calc(var(--density) × 1rem) for their padding.">
                    <ul className="border-t-2 border-rule">
                        {['Compact fits more rows on screen', 'Comfortable is the default', 'Spacious gives every row room'].map((row) => (
                            <li key={row} className="border-b border-rule-soft py-[calc(var(--density)*1rem)] text-ui">
                                {row}
                            </li>
                        ))}
                    </ul>
                </Specimen>
            </div>

            <Specimen title="Shapes">
                <div className="grid gap-8 sm:grid-cols-3">
                    <figure>
                        <div className="flex h-32 items-center">
                            <Button>Add feed</Button>
                        </div>
                        <figcaption className="mt-3 text-ui text-ink-2">
                            Each control has its own shape: 10px rectangles for buttons and inputs, round chips for filters, 6px flat labels for tags, 14px
                            stages.
                        </figcaption>
                    </figure>
                    <figure>
                        <div className="h-32 bg-field-leaf" />
                        <figcaption className="mt-3 text-ui text-ink-2">Square fields for category color. Only the edge of the hero swells.</figcaption>
                    </figure>
                    <figure>
                        <div className="flex h-32 flex-col justify-center">
                            <span className="block border-t-2 border-rule" />
                            <span className="mt-6 block border-t border-rule-soft" />
                            <span className="mt-6 block border-t border-rule-soft" />
                        </div>
                        <figcaption className="mt-3 text-ui text-ink-2">A 2px ink rule opens a list; 1px rules separate its rows.</figcaption>
                    </figure>
                </div>
            </Specimen>
        </DocSection>
    );
}
