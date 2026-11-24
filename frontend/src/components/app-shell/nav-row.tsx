// The current row is tinted, bold and has a field bar and aria-current, so the place never rests on colour alone. A
// row's quick-actions `menu` sits beside the link, never inside it.

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { formatCount } from './nav-entries';

type NavRowProps = {
    href: string;
    label: string;
    lead: ReactNode;
    color: string;
    isCurrent: boolean;
    count?: number | null;
    menu?: ReactNode;
};

export function NavRow({ href, label, lead, color, isCurrent, count, menu }: NavRowProps) {
    const shownCount = formatCount(count);
    const link = (
        <Link
            href={href}
            aria-current={isCurrent ? 'page' : undefined}
            className={`relative flex min-h-11 items-center gap-3 rounded-toggle px-3 text-ui transition-colors duration-150 lg:min-h-10 ${menu ? 'pointer-coarse:pr-12' : ''} ${isCurrent ? 'nav-current font-bold text-ink' : 'font-medium text-ink-2 hover:bg-ink/6 hover:text-ink'}`}
            style={isCurrent ? ({ '--row-field': color } as CSSProperties) : undefined}
        >
            {isCurrent && <span aria-hidden="true" className="nav-marker absolute inset-y-2 left-0 w-[3px] rounded-full" />}
            {lead}
            <span className="min-w-0 truncate">{label}</span>
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

    if (!menu)
        return link;

    return (
        <div className="group/row relative">
            {link}
            <div className="absolute inset-y-0 right-1 flex items-center pointer-fine:opacity-0 pointer-fine:group-focus-within/row:opacity-100 pointer-fine:group-hover/row:opacity-100">
                {menu}
            </div>
        </div>
    );
}

// The hairline keeps pale fields visible.
export function FieldDot({ color }: { color: string }) {
    return <span aria-hidden="true" className="fill-edge mx-[3px] size-3 flex-none rounded-full" style={{ background: color }} />;
}
