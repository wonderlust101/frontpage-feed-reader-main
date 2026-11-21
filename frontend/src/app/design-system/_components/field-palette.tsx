'use client';

// The eight-field palette tiles for the color section: each field's light and dark values, ink contrast, and which
// guest categories use it now (following the colors chosen in the picker below).

import { useCategoryFields } from '@/features/categories/category-field-store';
import { BRAND_FIELD, FIELDS, NO_FIELD } from '@/features/categories/fields';
import { CATEGORIES, CATEGORY_PRESETS } from '../_data/sample-data';

const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

// Renders the palette grid.
export function FieldPalette() {
    const [fields] = useCategoryFields(CATEGORY_IDS, CATEGORY_PRESETS);

    return (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-9">
            {[...FIELDS, NO_FIELD].map((field) => {
                const holders = CATEGORIES.filter((category) => fields[category.id].id === field.id).map((category) => category.name);
                return (
                    <li key={field.id} className="flex min-h-52 flex-col justify-between p-4 text-on-field" style={{ background: field.color }}>
                        <span className="type-title font-semibold">{field.name}</span>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-meta tabular-nums">
                            <dt className="font-semibold">Light</dt>
                            <dd>
                                {field.hex.light} · {field.inkContrast.light}
                            </dd>
                            <dt className="font-semibold">Dark</dt>
                            <dd>
                                {field.hex.dark} · {field.inkContrast.dark}
                            </dd>
                            <dt className="font-semibold">Used by</dt>
                            <dd>{field.id === BRAND_FIELD.id ? 'Frontpage' : holders.join(', ') || 'None yet'}</dd>
                        </dl>
                    </li>
                );
            })}
        </ul>
    );
}
