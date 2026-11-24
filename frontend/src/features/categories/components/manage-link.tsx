// "Manage", beside the panel's Categories heading: the way to the page for bulk work on categories and feeds (order,
// colors, moving and removing feeds). For guests it carries a lock and leads to sign-up.

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { Icon } from '@/components/ui/icon';

type ManageLinkProps = {
    href: string;
    locked?: boolean;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

// Renders the link; `locked` adds the lock and says why to screen readers.
export function ManageLink({ href, locked = false, onClick }: ManageLinkProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex min-h-11 items-center gap-1 rounded-control px-2 text-meta font-semibold text-ink-2 underline decoration-1 underline-offset-[0.25em] hover:text-ink hover:decoration-2 lg:min-h-8"
        >
            Manage
            {locked && (
                <>
                    <Icon name="locked" size="inline" />
                    <span className="sr-only">, with an account</span>
                </>
            )}
        </Link>
    );
}
