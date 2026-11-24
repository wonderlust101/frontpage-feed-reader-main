// A native <select> drawn like the text field, so phones keep their own picker.

import type { ComponentProps } from 'react';
import { Icon } from './icon';

type SelectProps = Omit<ComponentProps<'select'>, 'id'> & {
    id: string;
    label: string;
};

export function Select({ id, label, className = '', children, ...selectProps }: SelectProps) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <label htmlFor={id} className="text-ui font-semibold">
                {label}
            </label>
            <span className="relative flex items-center">
                <select
                    id={id}
                    className="h-12 w-full appearance-none rounded-control border-[1.5px] border-control-edge bg-control-fill pr-12 pl-5 text-ui text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    {...selectProps}
                >
                    {children}
                </select>
                <Icon name="expand" size="action" className="pointer-events-none absolute right-4" />
            </span>
        </div>
    );
}
