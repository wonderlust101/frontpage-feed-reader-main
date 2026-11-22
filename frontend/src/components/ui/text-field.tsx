// Labeled text input with an optional hint and error. The error shows an icon, a thicker border and text, never color alone.

import type { ComponentProps } from 'react';
import { Icon } from './icon';

type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
    id: string;
    label: string;
    hint?: string;
    error?: string;
};

// Renders the label, hint, error and input, wiring aria-describedby and aria-invalid for screen readers.
export function TextField({ id, label, hint, error, className = '', ...inputProps }: TextFieldProps) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
    const borderClasses = error ? 'border-[3px] border-error' : 'border-[1.5px] border-control-edge';

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <label htmlFor={id} className="text-ui font-semibold">
                {label}
            </label>
            {hint && (
                <p id={hintId} className="text-meta text-ink-2">
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} className="flex items-center gap-2 text-ui font-semibold text-error">
                    <Icon name="error" size="action" />
                    {error}
                </p>
            )}
            <input
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={`h-12 rounded-control bg-control-fill px-5 text-ui text-ink placeholder:text-muted ${borderClasses}`}
                {...inputProps}
            />
        </div>
    );
}
