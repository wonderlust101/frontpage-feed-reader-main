// Placeholder: guest mode will load the curated sample feeds here.

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Guest' };

export default function GuestPage() {
    return (
        <div className="mx-auto flex w-full max-w-page flex-col gap-4 px-gutter py-12">
            <h1 className="type-headline">Guest page (placeholder)</h1>
            <p>You are browsing as a guest. The sample feeds will load here.</p>
            <p>
                <Link href="/sign-up" className="underline">
                    Create an account
                </Link>{' '}
                to keep your feeds and categories.
            </p>
            <p>
                <Link href="/" className="underline">
                    Back to the home page
                </Link>
            </p>
        </div>
    );
}
