// Color section of the design system page: the field palette, categories of any topic taking fields, then neutrals and status.

import { CategoryTag } from '@/components/ui/tags';
import { BRAND_FIELD, CATEGORY_FIELDS, FIELDS } from '@/features/categories/fields';
import { CATEGORIES } from '../_data/sample-data';
import { DocSection, Specimen } from './doc-section';

const EXAMPLE_TOPICS = ['World news', 'Film & TV'];

const NEUTRALS = [
    { token: 'ground', light: '#F9F9F7', dark: '#0E0E0C', job: 'Page ground and the reading column' },
    { token: 'ground-2', light: '#EFEFEB', dark: '#1B1B18', job: 'Panels: AI summaries, code, row hover' },
    { token: 'ink', light: '#0A0A0A', dark: '#F3F3EE', job: 'Everything a reader must read' },
    { token: 'ink-2', light: '#3D3D3A', dark: '#C9C9C1', job: 'Intros and supporting text' },
    { token: 'meta', light: '#64645F', dark: '#9B9B93', job: 'Times, counts and source names only' },
    { token: 'rule-soft', light: '#E2E2DC', dark: '#2C2C28', job: 'Row rules between items' },
    { token: 'warning', light: '#8A5300', dark: '#F2B13B', job: 'Stale feeds and cautions, always with a label' },
    { token: 'error', light: '#B42318', dark: '#FF7A70', job: 'Failing feeds and form errors, always with an icon' },
];

// Renders the color section: the eight-field palette, categories of any topic taking fields, then the neutral tokens.
export function ColorSection() {
    return (
        <DocSection
            id="color"
            title="Color"
            intro="Lemon is Frontpage's own color: the home field, the All view and the brand. Every other color has one job: it tells you which category you are in. Categories are yours, about anything from frontend to film to politics, and each takes one of seven fields. Everything else is ink on the ground, and text on a field is always ink, in both themes."
        >
            <Specimen
                title="Field palette"
                stage="none"
                description="Flat and unmodulated. Lemon stays with Frontpage. New categories take the next free field after it, in this order, and you can swap any time. No two categories share a field until all seven are taken."
            >
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-8">
                    {FIELDS.map((field) => {
                        const category = CATEGORIES.find((candidate) => candidate.field.id === field.id);
                        return (
                            <li key={field.id} className="flex min-h-52 flex-col justify-between p-4 text-on-field" style={{ background: field.color }}>
                                <span className="font-display text-title leading-[1.1] font-semibold tracking-[-0.015em]">{field.name}</span>
                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-meta tabular-nums">
                                    <dt className="font-semibold">Hex</dt>
                                    <dd>{field.hex}</dd>
                                    <dt className="font-semibold">Ink</dt>
                                    <dd>{field.inkContrast}</dd>
                                    <dt className="font-semibold">Taken by</dt>
                                    <dd>{field.id === BRAND_FIELD.id ? 'Frontpage' : (category?.name ?? 'Free')}</dd>
                                </dl>
                            </li>
                        );
                    })}
                </ul>
            </Specimen>

            <Specimen
                title="Any topic"
                description="The guest feeds happen to be about tech. A reader's own categories take the remaining fields the same way."
            >
                <div className="flex flex-wrap items-center gap-2">
                    {CATEGORIES.map((category) => (
                        <CategoryTag key={category.id} name={category.name} field={category.field.color} />
                    ))}
                    {EXAMPLE_TOPICS.map((topic, index) => (
                        <CategoryTag key={topic} name={topic} field={CATEGORY_FIELDS[CATEGORIES.length + index].color} />
                    ))}
                </div>
                <p className="mt-3 text-meta text-muted">The last two are example categories, not guest feeds.</p>
            </Specimen>

            <Specimen
                title="Neutrals and status"
                stage="none"
                description="Ink and ground swap in dark mode; the field palette stays the same. Status colors are for text and lines only, never fills, so they never compete with category fields."
            >
                <ul className="border-t-2 border-rule sm:hidden">
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
                            <tr className="border-b-2 border-rule text-meta text-ink-2">
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
            <span className="block size-6 rounded-full border border-rule-soft" style={{ background: color }} />
            {color}
        </span>
    );
}
