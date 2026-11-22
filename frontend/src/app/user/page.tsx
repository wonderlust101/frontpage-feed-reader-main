// User page placeholder: no design yet. The signed-in reader's home will go here.

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Your front page' };

export default function UserPage() {
    return (
        <main id="main" className="mx-auto flex w-full max-w-page flex-col gap-4 px-gutter py-12">
            <h1 className="type-headline">User page (placeholder)</h1>
            <p>Your feeds will load here.</p>
            <p>
                <Link href="/" className="underline">
                    Back to the home page
                </Link>
            </p>
        </main>
    );
}
