// The app shell for signed-in readers, around every /user page, none of which search engines should index. The account
// menu (the rail's foot, the drawer's on phones) reads the session, so it streams in behind <Suspense> (Cache
// Components), inside its own error boundary: this route's error.tsx doesn't wrap this layout, and the page shows that
// error when the API is down.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell/app-shell';
import type { ShellView } from '@/components/app-shell/nav-entries';
import { AccountBoundary } from '@/features/auth/components/account-boundary';
import { AccountMenu } from '@/features/auth/components/account-menu';
import { currentUser } from '@/features/auth/require-user';

export const metadata: Metadata = { robots: { index: false } };

const READER_VIEWS = [{ href: '/user', label: 'All items', icon: 'all-items' }] satisfies ShellView[];

export default function UserLayout({ children }: LayoutProps<'/user'>) {
    return (
        <AppShell
            homeHref="/user"
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

// Renders the account menu for the signed-in reader, or nothing when the session has ended (the page redirects).
async function Account() {
    const user = await currentUser();

    return user && <AccountMenu user={user} />;
}
