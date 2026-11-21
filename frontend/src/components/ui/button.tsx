// Buttons, 10px rectangles: primary (ink fill), secondary (ink outline), quiet (underlined text) and destructive.
// Destructive buttons look like secondary ones at rest; callers keep them apart from other actions.

import type { ComponentProps } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive';

type ButtonProps = ComponentProps<'button'> & { variant?: ButtonVariant };

const BASE_CLASSES = 'inline-flex items-center gap-2 font-semibold text-ui transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary: 'h-11 rounded-[10px] bg-ink px-5 text-ground hover:bg-ink-2',
    secondary: 'h-11 rounded-[10px] border-[1.5px] border-ink px-5 text-ink hover:bg-ground-2',
    quiet: 'h-11 text-ink underline decoration-1 underline-offset-4 hover:decoration-2',
    destructive: 'h-11 rounded-[10px] border-[1.5px] border-ink px-5 text-ink hover:bg-ink hover:text-ground',
};

// Renders a button in one of the four variants; `type` defaults to "button" so it never submits a form by accident.
export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
    return <button type={type} className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`} {...props} />;
}
