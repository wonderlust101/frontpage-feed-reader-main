import type { ComponentProps } from 'react';

export function CheckMark(props: ComponentProps<'svg'>) {
    return (
        <svg viewBox="0 0 14 14" {...props}>
            <path d="M2.5 7.5L5.5 10.5L11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
