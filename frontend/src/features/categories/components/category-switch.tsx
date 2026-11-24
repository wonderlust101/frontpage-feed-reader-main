'use client';

// Category switch: one capsule per view ("All" plus each category), exactly one on. It is a radio group, so Tab
// enters on the chosen capsule and the arrow keys move and choose, the way a native radio group behaves.

import { useRef, type KeyboardEvent } from 'react';
import { Capsule } from '@/components/ui/capsule';
import type { Field } from '@/features/categories/fields';

type SwitchOption = {
    id: string;
    name: string;
    field: Pick<Field, 'id' | 'color' | 'onColor'>;
};

type CategorySwitchProps = {
    options: SwitchOption[];
    value: string;
    onChange: (id: string) => void;
    label: string;
    className?: string;
};

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];

const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];

// Renders the radio group; `value` is the chosen option's id and `onChange` receives the newly chosen id.
export function CategorySwitch({ options, value, onChange, label, className = '' }: CategorySwitchProps) {
    const groupRef = useRef<HTMLDivElement>(null);

    // Moves the choice one option along (wrapping at either end) and focuses it.
    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const step = NEXT_KEYS.includes(event.key) ? 1 : PREVIOUS_KEYS.includes(event.key) ? -1 : 0;

        if (step === 0)
            return;

        event.preventDefault();
        const current = options.findIndex((option) => option.id === value);
        const next = options[(current + step + options.length) % options.length];

        onChange(next.id);
        groupRef.current?.querySelector<HTMLElement>(`[data-option="${next.id}"]`)?.focus();
    }

    return (
        <div ref={groupRef} role="radiogroup" aria-label={label} onKeyDown={handleKeyDown} className={`flex flex-wrap gap-3 ${className}`}>
            {options.map((option) => (
                <Capsule
                    key={option.id}
                    kind="radio"
                    data-option={option.id}
                    field={option.field}
                    on={option.id === value}
                    tabIndex={option.id === value ? 0 : -1}
                    onClick={() => onChange(option.id)}
                >
                    {option.name}
                </Capsule>
            ))}
        </div>
    );
}
