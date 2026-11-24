// The app shell for guests, around every /guest page. It reads nothing per request, so guest pages stay static. The
// sign-up nudge sits in the header from sm up and in the sidebar's foot (the drawer's, on phones); it never blocks.

import { AppShell } from '@/components/app-shell/app-shell';
import type { ShellView } from '@/components/app-shell/nav-entries';
import { TextLink } from '@/components/ui/text-link';
import { GuestCard } from '@/features/auth/components/guest-card';
import { AppearanceMenu } from '@/features/preferences/components/appearance-menu';

const GUEST_VIEWS = [{ href: '/guest', label: 'All items', icon: 'all-items' }] satisfies ShellView[];

export default function GuestLayout({ children }: LayoutProps<'/guest'>) {
    return (
        <AppShell
            homeHref="/guest"
            views={GUEST_VIEWS}
            foot={<GuestCard />}
            actions={
                <>
                    <AppearanceMenu />
                    <TextLink href="/sign-up" standalone className="px-1 text-ui whitespace-nowrap text-on-shell max-sm:hidden">
                        Create account
                    </TextLink>
                </>
            }
        >
            {children}
        </AppShell>
    );
}
