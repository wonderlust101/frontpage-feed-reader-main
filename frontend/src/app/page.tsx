import { Suspense } from 'react';
import { Logo } from '@/components/logo';
import { BackendStatus } from './_components/backend-status';

export default function Home() {
    return (
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
            <h1>
                <Logo size="lg" />
            </h1>
            <Suspense fallback={<p className="text-sm text-muted">Checking backend…</p>}>
                <BackendStatus />
            </Suspense>
        </main>
    );
}
