// Buttons, 10px rectangles: primary (ink fill), secondary (ink outline), quiet (underlined text) and destructive.
// Destructive buttons are drawn in the error color, never filled, and callers keep them apart from other actions.
// A disabled button fades, except while it is busy (aria-busy: a form is submitting), when its "…ing" label is the
// status the reader needs, so it keeps full contrast. buttonClassName gives a link the same look.

import type { ComponentProps } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive';

type ButtonProps = ComponentProps<'button'> & { variant?: ButtonVariant };

const BASE_CLASSES =
    'inline-flex items-center gap-2 font-semibold text-ui transition-colors duration-200 disabled:cursor-not-allowed disabled:not-aria-busy:opacity-40 aria-busy:cursor-progress';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary: 'h-11 rounded-control border-[1.5px] border-transparent bg-ink px-5 text-ground hover:bg-ink-2',
    secondary: 'h-11 rounded-control border-[1.5px] border-control-edge px-5 text-ink hover:border-ink hover:bg-ground-2',
    quiet: 'h-11 text-ink underline decoration-1 underline-offset-4 hover:decoration-2',
    destructive: 'h-11 rounded-control border-[1.5px] border-error px-5 text-error hover:bg-ground-2',
};

// Renders a button in one of the four variants; `type` defaults to "button" so it never submits a form by accident.
export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
    return <button type={type} className={buttonClassName(variant, className)} {...props} />;
}

// Returns the classes for a button of `variant` plus `extra`, e.g. for a link that should look like a primary button.
export function buttonClassName(variant: ButtonVariant, extra = ''): string {
    return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${extra}`;
}
