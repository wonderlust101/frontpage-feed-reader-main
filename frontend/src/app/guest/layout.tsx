// The app shell for guests. It reads nothing per request, so guest pages stay static.

import type { ShellView } from '@/components/app-shell/nav-entries';
import type { SearchSource } from '@/components/app-shell/search-results';
import { ACCOUNT_FEATURE_VIEWS } from '@/features/auth/account-features';
import { GuestMenu } from '@/features/auth/components/guest-menu';
import { GUEST_CATEGORIES } from '@/features/categories/guest-categories';
import { GuestShell } from './_components/guest-shell';

const GUEST_VIEWS = [{ href: '/guest', label: 'All items', icon: 'all-items' }, ...ACCOUNT_FEATURE_VIEWS] satisfies ShellView[];

const GUEST_SOURCES = GUEST_CATEGORIES.flatMap((category) =>
    category.sources.map((source) => ({ href: `/guest/c/${category.id}`, name: source, detail: category.name, categoryHref: `/guest/c/${category.id}` })),
) satisfies SearchSource[];

export default function GuestLayout({ children }: LayoutProps<'/guest'>) {
    return (
        <GuestShell views={GUEST_VIEWS} sources={GUEST_SOURCES} account={<GuestMenu />}>
            {children}
        </GuestShell>
    );
}
