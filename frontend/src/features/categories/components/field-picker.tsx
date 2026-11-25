// Native radios, so Tab enters on the chosen swatch and the arrow keys move and choose.

import { CheckMark } from '@/components/ui/check-mark';
import { PICKABLE_FIELDS, type FieldId } from '../fields';

type FieldPickerProps = {
    name: string;
    legend: string;
    value: FieldId;
    onChange: (fieldId: FieldId) => void;
};

// `name` must be unique on the page.
export function FieldPicker({ name, legend, value, onChange }: FieldPickerProps) {
    return (
        <fieldset className="min-w-0">
            <legend className="sr-only">Color for {legend}</legend>
            <div className="flex flex-wrap gap-0.5">
                {PICKABLE_FIELDS.map((field) => (
                    <label key={field.id} title={field.name} className="field-swatch" data-field={field.id} style={{ '--swatch-field': field.color }}>
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
                            <CheckMark width="14" height="14" />
                        </span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
