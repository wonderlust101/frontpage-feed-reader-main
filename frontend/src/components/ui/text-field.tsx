// Labeled text input with an optional hint and error, both under the input in meta size. The error takes the hint's
// place (the hint returns once the field is fixed) and shows an icon, a thicker border and text, never color alone.
// Focus thickens the field's own edge by 1px, in its colour: ink, or red when invalid.
// `action` is a small control drawn inside the input's right edge, such as the password field's show/hide toggle.

import type { ComponentProps, ReactNode } from 'react';
import { Icon } from './icon';

type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    action?: ReactNode;
};

// Renders the label, input and the hint or error under it, wiring aria-describedby and aria-invalid for screen readers.
export function TextField({ id, label, hint, error, action, className = '', ...inputProps }: TextFieldProps) {
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy = error ? errorId : hint ? hintId : undefined;
    const borderClasses = error ? 'border-2 border-error' : 'border-[1.5px] border-control-edge';

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <label htmlFor={id} className="text-ui font-semibold">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={`text-field-input h-12 w-full rounded-control bg-control-fill px-5 text-ui text-ink placeholder:text-muted ${action ? 'pr-14' : ''} ${borderClasses}`}
                    {...inputProps}
                />
                {action && <div className="absolute inset-y-0 right-1 flex items-center">{action}</div>}
            </div>
            {error ? (
                <p id={errorId} className="flex items-start gap-1.5 text-meta font-semibold text-error">
                    <Icon name="error" size="inline" className="mt-0.5" />
                    {error}
                </p>
            ) : (
                hint && (
                    <p id={hintId} className="text-meta text-ink-2">
                        {hint}
                    </p>
                )
            )}
        </div>
    );
}
