// Category capsule: an outlined pill with the category's dot when off, filled with the category field and showing a
// check mark when on, so the state never rests on color alone. A filter capsule is a toggle (any number on); a
// switch capsule is a radio (exactly one on), and its group owns the arrow keys.

import type { ComponentProps, CSSProperties } from 'react';

type CapsuleProps = Omit<ComponentProps<'button'>, 'type' | 'role'> & {
    field: { color: string; onColor: string };
    on: boolean;
    kind?: 'toggle' | 'radio';
};

// Renders the capsule; `field.color` fills the dot and the on state, `field.onColor` is the text on that fill, `kind` picks
// toggle (aria-pressed) or radio (aria-checked).
export function Capsule({ field, on, kind = 'toggle', className = '', style, children, ...props }: CapsuleProps) {
    const capsuleColors = { '--capsule-field': field.color, '--capsule-on': field.onColor, ...style } as CSSProperties;
    const stateProps = kind === 'radio' ? { role: 'radio', 'aria-checked': on } : { 'aria-pressed': on };

    return (
        <button type="button" className={`capsule ${className}`} style={capsuleColors} {...stateProps} {...props}>
            <span className="capsule-mark" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14">
                    <path d="M2.5 7.5L5.5 10.5L11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
            {children}
        </button>
    );
}
