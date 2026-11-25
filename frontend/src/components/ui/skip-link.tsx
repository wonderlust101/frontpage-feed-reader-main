import type { ReactNode } from 'react';

type SkipLinkProps = {
    href: string;
    className?: string;
    children: ReactNode;
};

const SKIP_LINK_CLASSES =
    'sr-only focus:not-sr-only focus:fixed focus:z-50 focus:rounded-control focus:bg-ink focus:px-5 focus:py-3 focus:text-ui focus:font-semibold focus:text-ground';

// Hidden until focused; `className` places it on the page.
export function SkipLink({ href, className = '', children }: SkipLinkProps) {
    return (
        <a href={href} className={`${SKIP_LINK_CLASSES} ${className}`}>
            {children}
        </a>
    );
}
