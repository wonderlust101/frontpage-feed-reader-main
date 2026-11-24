// The app shell for guests, around every /guest page. It reads nothing per request, so guest pages stay static. The
// rail's foot (the drawer's, on phones) holds the guest menu: a gentle way to an account that never blocks reading.

import { AppShell } from '@/components/app-shell/app-shell';
import type { ShellView } from '@/components/app-shell/nav-entries';
import { GuestMenu } from '@/features/auth/components/guest-menu';
import { ReaderSettings } from '@/features/preferences/components/reader-settings';

const GUEST_VIEWS = [{ href: '/guest', label: 'All items', icon: 'all-items' }] satisfies ShellView[];

export default function GuestLayout({ children }: LayoutProps<'/guest'>) {
    return (
        <AppShell homeHref="/guest" views={GUEST_VIEWS} account={<GuestMenu />} utilities={<ReaderSettings />}>
            {children}
        </AppShell>
    );
}
