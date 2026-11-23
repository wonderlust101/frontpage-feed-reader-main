// Field picker: "No color" and the eight category colors as a row of round swatches, one radio group per category.
// Native radios, so Tab enters on the chosen swatch and the arrow keys move and choose. The chosen swatch shows a check.

import type { CSSProperties } from 'react';
import { PICKABLE_FIELDS, type FieldId } from '../fields';

type FieldPickerProps = {
    name: string;
    legend: string;
    value: FieldId;
    onChange: (fieldId: FieldId) => void;
};

// Renders the radio group; `name` must be unique on the page, `legend` is the category's name.
export function FieldPicker({ name, legend, value, onChange }: FieldPickerProps) {
    return (
        <fieldset className="min-w-0">
            <legend className="sr-only">Color for {legend}</legend>
            <div className="flex flex-wrap gap-0.5">
                {PICKABLE_FIELDS.map((field) => {
                    return (
                        <label
                            key={field.id}
                            title={field.name}
                            className="field-swatch"
                            data-field={field.id}
                            style={{ '--swatch-field': field.color } as CSSProperties}
                        >
                            <input
                                type="radio"
                                name={name}
                                value={field.id}
                                checked={value === field.id}
                                onChange={() => onChange(field.id)}
                                aria-label={field.name}
                                className="sr-only"
                            />
                            <span className="field-swatch-dot" aria-hidden="true">
                                <svg viewBox="0 0 14 14" width="14" height="14">
                                    <path
                                        d="M2.5 7.5L5.5 10.5L11.5 3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
