'use client';

// Category colors settings: each category with its tag as it looks now and a field picker. Any number of categories
// may share a color; a category without a choice keeps its preset, or "No color". Guests' choices are saved on this device.

import { useState } from 'react';
import { CategoryTag } from '@/components/ui/tags';
import { useCategoryFields } from '../category-field-store';
import { categoryFieldById, type FieldChoices, type FieldId } from '../fields';
import { FieldPicker } from './field-picker';

type ColorCategory = { id: string; name: string };

// Renders one row per category; `presets` are the fields categories start with (sample data).
export function CategoryColors({ categories, presets }: { categories: ColorCategory[]; presets?: FieldChoices }) {
    const [fields, choose] = useCategoryFields(
        categories.map((category) => category.id),
        presets,
    );
    const [announcement, setAnnouncement] = useState('');

    // Applies the choice and says what happened.
    function handleChange(category: ColorCategory, fieldId: FieldId) {
        choose(category.id, fieldId);
        setAnnouncement(fieldId === 'none' ? `${category.name} now has no color.` : `${category.name} now uses ${categoryFieldById(fieldId)?.name}.`);
    }

    return (
        <div>
            <ul className="rule-t">
                {categories.map((category) => (
                    <li key={category.id} className="grid items-center gap-x-6 gap-y-3 border-b border-rule-soft py-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                        <span>
                            <CategoryTag name={category.name} field={fields[category.id]} />
                        </span>
                        <FieldPicker
                            name={`field-${category.id}`}
                            legend={category.name}
                            value={fields[category.id].id}
                            onChange={(fieldId) => handleChange(category, fieldId)}
                        />
                    </li>
                ))}
            </ul>
            <p aria-live="polite" className="mt-3 min-h-6 text-meta text-ink-2">
                {announcement}
            </p>
        </div>
    );
}
