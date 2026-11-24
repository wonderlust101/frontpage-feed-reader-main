// User page placeholder: no design yet. The signed-in reader's home will go here, inside the app shell (user/layout.tsx),
// whose account menu now holds the account actions. The page still checks the session itself, so it streams in behind
// <Suspense> and sends a signed-out visitor to sign-in with the right return path.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireUser } from '@/features/auth/require-user';

export const metadata: Metadata = { title: 'Your front page' };

export default function UserPage() {
    return (
        <div className="mx-auto flex w-full max-w-page flex-col gap-4 px-gutter py-12">
            <h1 className="type-headline">User page (placeholder)</h1>
            <Suspense fallback={<p className="text-muted">Checking your account…</p>}>
                <SignedInAs />
            </Suspense>
            <p>
                <Link href="/" className="underline">
                    Back to the home page
                </Link>
            </p>
        </div>
    );
}

// Says who is signed in; redirects to sign-in if nobody is.
async function SignedInAs() {
    const user = await requireUser('/user');

    return <p>Signed in as {user.name}.</p>;
}
