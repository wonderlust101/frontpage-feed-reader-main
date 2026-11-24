// One entry in the shell's category panel or drawer. The current entry is tinted with its field, carries a field bar
// that grows into place, is bold and has aria-current, so the place never rests on colour alone. Labels truncate; the
// full name stays the link's accessible name.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatCount } from './nav-entries';

type NavRowProps = {
    href: string;
    label: string;
    lead: ReactNode;
    color: string;
    isCurrent: boolean;
    count?: number | null;
};

// Renders the row; `lead` is its icon or field dot, `color` its field (Lemon for a view).
export function NavRow({ href, label, lead, color, isCurrent, count }: NavRowProps) {
    const shownCount = formatCount(count);

    return (
        <Link
            href={href}
            aria-current={isCurrent ? 'page' : undefined}
            className={`relative flex min-h-10 items-center gap-3 rounded-toggle px-3 text-ui transition-colors duration-150 ${isCurrent ? 'font-bold text-ink' : 'font-medium text-ink-2 hover:bg-ink/6 hover:text-ink'}`}
            style={isCurrent ? { background: `color-mix(in srgb, ${color} 24%, var(--color-panel))` } : undefined}
        >
            {isCurrent && <span aria-hidden="true" className="nav-marker absolute inset-y-2 left-0 w-[3px] rounded-full" style={{ background: color }} />}
            {lead}
            <span className="min-w-0 truncate">{label}</span>
            {shownCount && (
                <span className="ml-auto pl-2 text-meta font-semibold tabular-nums">
                    {shownCount}
                    <span className="sr-only"> unread</span>
                </span>
            )}
        </Link>
    );
}

// Renders a category's field dot, with the hairline that keeps pale fields visible.
export function FieldDot({ color }: { color: string }) {
    return <span aria-hidden="true" className="fill-edge mx-[3px] size-3 flex-none rounded-full" style={{ background: color }} />;
}
