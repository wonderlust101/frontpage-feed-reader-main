// The error takes the hint's place without moving the form: both share one grid cell and the hint only turns
// invisible. `action` is a small control inside the input's right edge, such as the password toggle.

import type { ComponentProps, ReactNode } from 'react';
import { Icon } from './icon';

type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    action?: ReactNode;
    // Another element that describes the field, such as the step's text above the form.
    describedBy?: string;
};

export function TextField({ id, label, hint, error, action, describedBy, className = '', ...inputProps }: TextFieldProps) {
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedByIds: string[] = [];

    if (error) {
        describedByIds.push(errorId);
    } else if (hint) {
        describedByIds.push(hintId);
    }

    if (describedBy)
        describedByIds.push(describedBy);

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
                    aria-describedby={describedByIds.join(' ') || undefined}
                    className={`text-field-input h-12 w-full rounded-control bg-control-fill px-5 text-ui text-ink placeholder:text-muted ${action ? 'pr-14' : ''} ${borderClasses}`}
                    {...inputProps}
                />
                {action && <div className="absolute inset-y-0 right-1 flex items-center">{action}</div>}
            </div>
            {(hint || error) && (
                <div className="grid">
                    {hint && (
                        <p id={hintId} className={`col-start-1 row-start-1 text-meta text-ink-2 ${error ? 'invisible' : ''}`}>
                            {hint}
                        </p>
                    )}
                    {error && (
                        <p id={errorId} className="col-start-1 row-start-1 flex items-start gap-1.5 text-meta font-semibold text-error">
                            <Icon name="error" size="inline" className="mt-0.5" />
                            {error}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
