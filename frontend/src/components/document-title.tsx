'use client';

// For a title the page's metadata can't know (an error boundary, a step the URL decides); restored on unmount.

import { useEffect } from 'react';
import { SITE_NAME } from '@/lib/site';

export function DocumentTitle({ title }: { title: string }) {
    useEffect(() => {
        const previous = document.title;

        document.title = `${title} · ${SITE_NAME}`;

        return () => {
            document.title = previous;
        };
    }, [title]);

    return null;
}
