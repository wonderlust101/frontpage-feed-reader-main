// Color section of the design system page: the field palette, categories of any topic taking fields, then neutrals and status.

import { CategoryTag } from '@/components/ui/tags';
import { CategoryColors } from '@/features/categories/components/category-colors';
import { NEUTRALS } from '../_data/neutrals';
import { CATEGORIES, CATEGORY_PRESETS, READER_CATEGORIES } from '../_data/sample-data';
import { DocSection, Specimen } from './doc-section';
import { FieldPalette } from './field-palette';

// Renders the color section: the eight-field palette, categories of any topic taking fields, then the neutral tokens.
export function ColorSection() {
    return (
        <DocSection
            id="color"
            title="Color"
            intro="Lemon is Frontpage's own color: the home field, the All view and the brand. On a category, every color, Lemon included, has one job: it tells you which category you are in. Categories are yours, about anything from frontend to film to politics, and you choose their colors. Everything else is ink on the ground, and text on a field is always ink, in both themes."
        >
            <Specimen
                title="Field palette"
                stage="none"
                description="Flat and unmodulated. All eight go to categories, Lemon included, as many as a reader likes on each, and No color, a neutral stone, is where every new category starts. Every field keeps one color in both themes. Lemon is a warm gold rather than an acid yellow, so the hero sits as comfortably on the paper ground as on the dark one."
            >
                <FieldPalette />
            </Specimen>

            <Specimen
                title="Any topic, any number"
                description="The guest feeds happen to be about tech. A reader's own categories work the same way: any color, shared if they like, or No color until they choose. No color is a field like the others, so an uncolored category looks just as finished."
            >
                <div className="flex flex-wrap items-center gap-2">
                    {READER_CATEGORIES.map((topic) => (
                        <CategoryTag key={topic.name} name={topic.name} field={topic.field} />
                    ))}
                </div>
                <p className="mt-3 text-meta text-muted">The last four are example categories, not guest feeds.</p>
            </Specimen>

            <Specimen
                title="Choose colors"
                description="Readers pick each category's color, No color included. Categories may share one. Guests' choices are saved on this device; the hero and palette above use them too."
            >
                <CategoryColors categories={CATEGORIES} presets={CATEGORY_PRESETS} />
            </Specimen>

            <Specimen
                title="Neutrals and status"
                stage="none"
                description="Ink and ground swap in dark mode. High contrast, from the system setting or the reader settings, raises supporting text and status to 7:1 and draws every rule and edge in ink. Status colors are for text and lines only, never fills, so they never compete with category fields."
            >
                <ul className="rule-t sm:hidden">
                    {NEUTRALS.map((neutral) => (
                        <li key={neutral.token} className="border-b border-rule-soft py-3">
                            <span className="block text-ui font-semibold">{neutral.token}</span>
                            <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                <Chip color={neutral.light} />
                                <Chip color={neutral.dark} />
                            </span>
                            <span className="mt-2 block text-ui text-ink-2">{neutral.job}</span>
                        </li>
                    ))}
                </ul>
                <div className="hidden sm:block">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="rule-b text-meta text-ink-2">
                                <th scope="col" className="py-2 pr-4 font-semibold">
                                    Token
                                </th>
                                <th scope="col" className="py-2 pr-4 font-semibold">
                                    Light
                                </th>
                                <th scope="col" className="py-2 pr-4 font-semibold">
                                    Dark
                                </th>
                                <th scope="col" className="py-2 font-semibold">
                                    Job
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {NEUTRALS.map((neutral) => (
                                <tr key={neutral.token} className="border-b border-rule-soft">
                                    <th scope="row" className="py-3 pr-4 text-ui font-semibold">
                                        {neutral.token}
                                    </th>
                                    <td className="py-3 pr-4">
                                        <Chip color={neutral.light} />
                                    </td>
                                    <td className="py-3 pr-4">
                                        <Chip color={neutral.dark} />
                                    </td>
                                    <td className="py-3 text-ui text-ink-2">{neutral.job}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Specimen>
        </DocSection>
    );
}

// Renders a small swatch with its hex value, used in the neutrals table.
function Chip({ color }: { color: string }) {
    return (
        <span className="inline-flex items-center gap-2 text-meta tabular-nums">
            <span className="fill-edge block size-6 rounded-full" style={{ background: color }} />
            {color}
        </span>
    );
}
