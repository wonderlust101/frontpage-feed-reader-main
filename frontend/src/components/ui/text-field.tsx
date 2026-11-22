// Labeled text input with an optional hint and error. The error shows an icon, a thicker border and text, never color alone,
// and sits under the input. Focus thickens the ink edge (an inset ring, so nothing moves) inside a Lemon glow.
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

// Renders the label, hint, error and input, wiring aria-describedby and aria-invalid for screen readers.
export function TextField({ id, label, hint, error, action, className = '', ...inputProps }: TextFieldProps) {
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
            <div className="relative">
                <input
                    id={id}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={`text-field-input h-12 w-full rounded-control bg-control-fill px-5 text-ui text-ink transition-shadow duration-150 placeholder:text-muted ${action ? 'pr-14' : ''} ${borderClasses}`}
                    {...inputProps}
                />
                {action && <div className="absolute inset-y-0 right-1 flex items-center">{action}</div>}
            </div>
            {error && (
                <p id={errorId} className="flex items-start gap-2 text-ui font-semibold text-error">
                    <Icon name="error" size="action" className="mt-0.5" />
                    {error}
                </p>
            )}
        </div>
    );
}
