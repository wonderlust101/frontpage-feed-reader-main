// The account menu reads the session, so it streams in behind <Suspense> inside its own error boundary: this
// route's error.tsx doesn't wrap this layout.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell/app-shell';
import type { ShellView } from '@/components/app-shell/nav-entries';
import { AccountBoundary } from '@/features/auth/components/account-boundary';
import { AccountMenu } from '@/features/auth/components/account-menu';
import { ACCOUNT_HOME } from '@/features/auth/redirect-target';
import { currentUser } from '@/features/auth/require-user';

export const metadata: Metadata = { robots: { index: false } };

const READER_VIEWS = [{ href: ACCOUNT_HOME, label: 'All items', icon: 'all-items' }] satisfies ShellView[];

export default function UserLayout({ children }: LayoutProps<'/user'>) {
    return (
        <AppShell
            homeHref={ACCOUNT_HOME}
            views={READER_VIEWS}
            account={
                <AccountBoundary>
                    <Suspense fallback={<span aria-hidden="true" className="block size-11 rounded-full bg-skeleton" />}>
                        <Account />
                    </Suspense>
                </AccountBoundary>
            }
        >
            {children}
        </AppShell>
    );
}

// Nothing when the session has ended; the page redirects.
async function Account() {
    const user = await currentUser();

    return user && <AccountMenu user={user} />;
}
