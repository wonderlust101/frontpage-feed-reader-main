'use client';

// TEMPORARY PLACEHOLDER, no design yet: what a signed-in page shows when the API can't say who is signed in (it is
// down, slow or erroring), rendered by that route's error.tsx. Designing it is planned on the `feat/error-pages`
// branch (docs/notes/error-pages.md there). It never shows the error's details, only what to do next.

import Link from 'next/link';
import { UNAVAILABLE } from '../error-messages';

type AccountUnavailableProps = {
    retry: () => void;
};

// Renders the message, a "Try again" button that re-renders the page (`retry` from error.tsx), and a link home.
export function AccountUnavailable({ retry }: AccountUnavailableProps) {
    return (
        <main id="main" className="mx-auto flex w-full max-w-page flex-col gap-4 px-gutter py-12">
            <h1 className="type-headline">Can&apos;t reach your account (placeholder)</h1>
            <p>{UNAVAILABLE}</p>
            <p>
                <button type="button" onClick={retry} className="underline">
                    Try again
                </button>
            </p>
            <p>
                <Link href="/" className="underline">
                    Back to the home page
                </Link>
            </p>
        </main>
    );
}
