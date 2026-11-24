// One entry in the shell's category panel or drawer. The current entry is tinted with its field (.nav-current), carries
// a field bar that grows into place, is bold and has aria-current, so the place never rests on colour alone. Unread
// counts are small Bricolage chips (ink on the current row). A locked entry (a guest's account-only views) carries a
// lock, at full contrast. A row may carry a quick-actions `menu`, beside the link rather than in it: with a mouse it replaces the count
// while the row is hovered or focused; on touch it stays in view. Labels truncate; the full name stays the link's
// accessible name.

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
    menu?: ReactNode;
};

// Renders the row; `lead` is its icon or field dot, `color` its field (Lemon for a view).
export function NavRow({ href, label, lead, color, isCurrent, count, locked = false, menu }: NavRowProps) {
    const shownCount = formatCount(count);
    const link = (
        <Link
            href={href}
            aria-current={isCurrent ? 'page' : undefined}
            className={`relative flex min-h-11 items-center gap-3 rounded-toggle px-3 text-ui transition-colors duration-150 lg:min-h-10 ${menu ? 'pointer-coarse:pr-12' : ''} ${isCurrent ? 'nav-current font-bold text-ink' : 'font-medium text-ink-2 hover:bg-ink/6 hover:text-ink'}`}
            style={isCurrent ? ({ '--row-field': color } as CSSProperties) : undefined}
        >
            {isCurrent && <span aria-hidden="true" className="nav-marker absolute inset-y-2 left-0 w-[3px] rounded-full" style={{ background: color }} />}
            {lead}
            <span className="min-w-0 truncate">{label}</span>
            {locked && (
                <span className="ml-auto flex items-center gap-1 text-meta text-ink-2">
                    <Icon name="locked" size="inline" />
                    <span className="sr-only">, with an account</span>
                </span>
            )}
            {shownCount && (
                <span
                    className={`ml-auto rounded-full px-2 font-display text-meta leading-6 font-semibold ${isCurrent ? 'bg-ink text-ground' : 'bg-ink/8 text-ink-2'} ${menu ? 'pointer-fine:group-focus-within/row:invisible pointer-fine:group-hover/row:invisible' : ''}`}
                >
                    {shownCount}
                    <span className="sr-only"> unread</span>
                </span>
            )}
        </Link>
    );

    if (!menu) {
        return link;
    }
    return (
        <div className="group/row relative">
            {link}
            <div className="absolute inset-y-0 right-1 flex items-center pointer-fine:opacity-0 pointer-fine:group-focus-within/row:opacity-100 pointer-fine:group-hover/row:opacity-100">
                {menu}
            </div>
        </div>
    );
}

// Renders a category's field dot, with the hairline that keeps pale fields visible.
export function FieldDot({ color }: { color: string }) {
    return <span aria-hidden="true" className="fill-edge mx-[3px] size-3 flex-none rounded-full" style={{ background: color }} />;
}
