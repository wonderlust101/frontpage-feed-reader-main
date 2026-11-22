// User page placeholder: no design yet. The signed-in reader's home will go here. The account details read the
// session, so they stream in behind <Suspense> while the rest of the page is served straight away.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { requireUser } from '@/features/auth/require-user';

export const metadata: Metadata = { title: 'Your front page', robots: { index: false } };

export default function UserPage() {
    return (
        <main id="main" className="mx-auto flex w-full max-w-page flex-col gap-4 px-gutter py-12">
            <h1 className="type-headline">User page (placeholder)</h1>
            <Suspense fallback={<p className="text-muted">Checking your account…</p>}>
                <AccountDetails />
            </Suspense>
            <p>
                <Link href="/" className="underline">
                    Back to the home page
                </Link>
            </p>
        </main>
    );
}

// Shows who is signed in, whether their email is verified, and the account actions; redirects to sign-in if nobody is.
async function AccountDetails() {
    const user = await requireUser('/user');

    return (
        <>
            <p>
                Signed in as {user.name} ({user.email}).
            </p>
            <p>
                Email {user.emailVerified ? 'verified.' : 'not verified. '}
                {!user.emailVerified && (
                    <Link href="/verify-email" className="underline">
                        Verify now
                    </Link>
                )}
            </p>
            <p>
                <Link href="/account/password" className="underline">
                    Change password
                </Link>
            </p>
            <div>
                <SignOutButton />
            </div>
        </>
    );
}
