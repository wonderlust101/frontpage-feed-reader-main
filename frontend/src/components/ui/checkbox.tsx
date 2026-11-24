// A native checkbox drawn as an ink square; the whole label is the hit area.

import type { ComponentProps } from 'react';

type CheckboxProps = Omit<ComponentProps<'input'>, 'type' | 'id'> & {
    id: string;
    label: string;
    hint?: string;
};

export function Checkbox({ id, label, hint, className = '', ...inputProps }: CheckboxProps) {
    const hintId = hint ? `${id}-hint` : undefined;

    return (
        <label htmlFor={id} className={`grid cursor-pointer grid-cols-[1.25rem_1fr] items-start gap-x-3 gap-y-1 py-1 ${className}`}>
            <span className="relative mt-0.5 grid size-5 place-items-center">
                <input
                    id={id}
                    type="checkbox"
                    aria-describedby={hintId}
                    className="peer size-5 cursor-pointer appearance-none rounded-tag border-[1.5px] border-control-edge bg-control-fill checked:border-ink checked:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
                    {...inputProps}
                />
                <svg aria-hidden="true" viewBox="0 0 14 14" className="pointer-events-none absolute size-3.5 text-ground opacity-0 peer-checked:opacity-100">
                    <path d="M2.5 7.5L5.5 10.5L11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
            <span className="text-ui font-semibold">{label}</span>
            {hint && (
                <span id={hintId} className="col-start-2 text-meta text-ink-2">
                    {hint}
                </span>
            )}
        </label>
    );
}
