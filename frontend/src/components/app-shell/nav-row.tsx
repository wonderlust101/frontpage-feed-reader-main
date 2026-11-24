// One entry in the shell's category panel or drawer. The current entry is tinted with its field (.nav-current), carries
// a field bar that grows into place, is bold and has aria-current, so the place never rests on colour alone. Unread
// counts are small Bricolage chips (ink on the current row). A locked entry (a guest's account-only view) is muted with
// a lock. Labels truncate; the full name stays the link's accessible name.

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { formatCount } from './nav-entries';

type NavRowProps = {
    href: string;
    label: string;
    lead: ReactNode;
    color: string;
    isCurrent: boolean;
    count?: number | null;
    locked?: boolean;
};

// Renders the row; `lead` is its icon or field dot, `color` its field (Lemon for a view).
export function NavRow({ href, label, lead, color, isCurrent, count, locked = false }: NavRowProps) {
    const shownCount = formatCount(count);

    return (
        <Link
            href={href}
            aria-current={isCurrent ? 'page' : undefined}
            className={`relative flex min-h-11 items-center gap-3 rounded-toggle px-3 text-ui transition-colors duration-150 lg:min-h-10 ${isCurrent ? 'nav-current font-bold text-ink' : 'font-medium text-ink-2 hover:bg-ink/6 hover:text-ink'} ${locked ? 'opacity-70' : ''}`}
            style={isCurrent ? ({ '--row-field': color } as CSSProperties) : undefined}
        >
            {isCurrent && <span aria-hidden="true" className="nav-marker absolute inset-y-2 left-0 w-[3px] rounded-full" style={{ background: color }} />}
            {lead}
            <span className="min-w-0 truncate">{label}</span>
            {locked && (
                <span className="ml-auto flex items-center gap-1 text-meta text-muted">
                    <Icon name="locked" size="inline" />
                    <span className="sr-only">, with an account</span>
                </span>
            )}
            {shownCount && (
                <span
                    className={`ml-auto rounded-full px-2 font-display text-meta leading-6 font-semibold ${isCurrent ? 'bg-ink text-ground' : 'bg-ink/8 text-ink-2'}`}
                >
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

// Renders "all categories" as a small overlapping stack of the first three category fields (Lemon when there are none),
// so the "all" row looks like every colour at once.
export function AllDots({ colors }: { colors: string[] }) {
    const shown = colors.length > 0 ? colors.slice(0, 3) : ['var(--color-field-lemon)'];
    return (
        <span aria-hidden="true" className="flex w-[18px] flex-none items-center">
            {shown.map((color, index) => (
                <span key={color + index} className="fill-edge -ml-1.5 size-2.5 rounded-full ring-1 ring-panel first:ml-0" style={{ background: color }} />
            ))}
        </span>
    );
}
