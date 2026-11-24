import type { ReactNode } from 'react';

// Hidden from screen readers, which get the control's own name.
export function RailTooltip({ children }: { children: ReactNode }) {
    return (
        <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-full z-30 ml-2 -translate-y-1/2 rounded-toggle bg-on-field px-2.5 py-1.5 text-meta font-semibold whitespace-nowrap text-on-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
            {children}
        </span>
    );
}
