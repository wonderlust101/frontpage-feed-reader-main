// A filter capsule is a toggle (any number on); a switch capsule is a radio (exactly one on). A check shows when on,
// so the state never rests on colour alone.

import { CheckMark } from './check-mark';
import type { ComponentProps, CSSProperties } from 'react';

type CapsuleProps = Omit<ComponentProps<'button'>, 'type' | 'role'> & {
    field: { color: string; onColor: string };
    on: boolean;
    kind?: 'toggle' | 'radio';
};

export function Capsule({ field, on, kind = 'toggle', className = '', style, children, ...props }: CapsuleProps) {
    const capsuleColors: CSSProperties = { '--capsule-field': field.color, '--capsule-on': field.onColor, ...style };
    const stateProps = kind === 'radio' ? { role: 'radio', 'aria-checked': on } : { 'aria-pressed': on };

    return (
        <button type="button" className={`capsule ${className}`} style={capsuleColors} {...stateProps} {...props}>
            <span className="capsule-mark" aria-hidden="true">
                <CheckMark width="14" height="14" />
            </span>
            {children}
        </button>
    );
}
