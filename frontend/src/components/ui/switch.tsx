'use client';

// An on/off setting that applies at once. On shows a check, so the state never rests on colour or position alone.
// Styles live in components.css.

import type { ComponentProps } from 'react';

type SwitchProps = Omit<ComponentProps<'button'>, 'type' | 'role' | 'onChange'> & {
    label: string;
    on: boolean;
    onChange: (on: boolean) => void;
};

export function Switch({ label, on, onChange, className = '', ...props }: SwitchProps) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`switch ${className}`} {...props}>
            <span className="flex-1">{label}</span>
            <span aria-hidden="true" className="switch-track">
                <span className="switch-thumb">
                    <svg viewBox="0 0 14 14" width="12" height="12">
                        <path d="M3 7.5L5.75 10.25L11 4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </span>
        </button>
    );
}
