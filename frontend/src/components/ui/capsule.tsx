// Category filter capsule: an outlined pill with the category color dot when off, filled with the category
// field and showing a check mark when on, so the state never rests on color alone.

import type { ComponentProps, CSSProperties } from 'react';

type CapsuleProps = Omit<ComponentProps<'button'>, 'type'> & {
    field: string;
    pressed: boolean;
};

// Renders a toggle button; `field` is the category CSS color, used for the dot and the pressed fill.
export function Capsule({ field, pressed, className = '', style, children, ...props }: CapsuleProps) {
    const capsuleColors = { '--capsule-field': field, ...style } as CSSProperties;

    return (
        <button type="button" aria-pressed={pressed} className={`capsule ${className}`} style={capsuleColors} {...props}>
            <span className="capsule-mark" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14">
                    <path d="M2.5 7.5L5.5 10.5L11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
            {children}
        </button>
    );
}
