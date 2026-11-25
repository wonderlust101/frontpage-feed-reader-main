import Link from 'next/link';
import { Suspense } from 'react';
import { BackendStatus } from './_components/backend-status';

export default function Home() {
    return (
        <main id="main" className="mx-auto flex w-full max-w-page flex-col gap-4 px-gutter py-12">
            <h1 className="type-headline">Frontpage marketing page (placeholder)</h1>
            <p>The landing page will go here.</p>
            <ul className="flex flex-col gap-2">
                <li>
                    <Link href="/sign-in" className="underline">
                        Sign in
                    </Link>
                </li>
                <li>
                    <Link href="/sign-up" className="underline">
                        Create account
                    </Link>
                </li>
                <li>
                    <Link href="/guest" className="underline">
                        Continue as guest
                    </Link>
                </li>
            </ul>
            <Suspense fallback={<p className="text-ui text-muted">Checking backend…</p>}>
                <BackendStatus />
            </Suspense>
        </main>
    );
}
