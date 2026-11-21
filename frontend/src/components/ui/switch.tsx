'use client';

// Switch: an on/off setting that applies at once (no save button). The setting's name on the left, a 48 × 28 track on
// the right. Off: an ink-outlined track with a quiet ink-2 thumb. On: the track fills with Lemon and the ink thumb
// slides right and shows a check, so the state never rests on color or position alone. Styles in components.css.

import type { ComponentProps } from 'react';

type SwitchProps = Omit<ComponentProps<'button'>, 'type' | 'role' | 'onChange'> & {
    label: string;
    on: boolean;
    onChange: (on: boolean) => void;
};

// Renders the switch as role="switch" with aria-checked; `onChange` receives the new state.
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
