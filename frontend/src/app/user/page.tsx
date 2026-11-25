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

async function SignedInAs() {
    const user = await requireUser('/user');

    return <p>Signed in as {user.name}.</p>;
}
