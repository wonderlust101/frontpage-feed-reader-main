// Text link: an underlined, semibold Next.js Link whose underline thickens on hover. Inside a sentence it stays
// inline; a `standalone` link (on its own line, or the action in a notice) gets a 44px-tall hit area, so it is easy
// to tap without looking any bigger.

import Link from 'next/link';
import type { ComponentProps } from 'react';

type TextLinkProps = ComponentProps<typeof Link> & { standalone?: boolean };

const BASE_CLASSES = 'font-semibold underline decoration-1 underline-offset-4 hover:decoration-2';

const STANDALONE_CLASSES = 'inline-flex min-h-11 items-center';

// Renders the link; extra classes (e.g. colour or size) are added after the base ones.
export function TextLink({ standalone = false, className = '', ...props }: TextLinkProps) {
    return <Link className={`${standalone ? STANDALONE_CLASSES : ''} ${BASE_CLASSES} ${className}`} {...props} />;
}
