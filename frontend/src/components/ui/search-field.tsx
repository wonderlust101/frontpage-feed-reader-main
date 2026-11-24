'use client';

// The label is visually hidden because the icon and placeholder already say what the field is for.

import { useRef, type ComponentProps } from 'react';
import { Icon } from './icon';

type SearchFieldProps = Omit<ComponentProps<'input'>, 'type' | 'id' | 'value' | 'onChange'> & {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
};

// Clearing empties the query and returns focus to the field.
export function SearchField({ id, label, value, onChange, className = '', ...inputProps }: SearchFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div role="search" className={`relative flex items-center ${className}`}>
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <Icon name="search" size="action" className="pointer-events-none absolute left-4 text-ink-2" />
            <input
                ref={inputRef}
                id={id}
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 w-full rounded-control border-[1.5px] border-control-edge bg-control-fill pr-12 pl-12 text-ui text-ink placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
                {...inputProps}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => {
                        onChange('');
                        inputRef.current?.focus();
                    }}
                    className="absolute right-1 grid size-9 place-items-center rounded-toggle hover:bg-ground-2"
                >
                    <Icon name="close" size="action" label="Clear search" />
                </button>
            )}
        </div>
    );
}
