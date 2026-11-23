'use client';

// Sets the tab title while it is mounted, for a state whose title the page's metadata can't know: an error boundary,
// or a step the URL or a request decides (an expired link). The previous title comes back when it unmounts.

import { useEffect } from 'react';

const SITE_NAME = 'Frontpage';

// Shows "`title` · Frontpage" as the document title while mounted; renders nothing.
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
