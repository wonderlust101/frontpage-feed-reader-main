// The shell's header: the near-black bar with a 4px Lemon stripe along its bottom, holding the drawer's menu button
// (below lg), the logo linking home (the small lockup on phones) and the actions on the right.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';

type ShellHeaderProps = {
    homeHref: string;
    drawer: ReactNode;
    actions: ReactNode;
    className?: string;
};

// Renders the bar; `drawer` is the menu button and drawer, `actions` the controls on the right.
export function ShellHeader({ homeHref, drawer, actions, className = '' }: ShellHeaderProps) {
    return (
        <header className={`flex h-19 items-center gap-3 border-b-4 border-field-lemon bg-shell px-3 text-on-shell sm:px-4 lg:px-6 ${className}`}>
            {drawer}
            <Link href={homeHref} className="flex min-h-11 flex-none items-center rounded-control">
                <Logo size="sm" className="sm:hidden" />
                <Logo size="md" className="max-sm:hidden" />
            </Link>
            <div className="ml-auto flex min-w-0 items-center gap-2">{actions}</div>
        </header>
    );
}
