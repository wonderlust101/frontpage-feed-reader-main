// The app shell for guests, around every /guest page. Guests get the curated sample categories (each with its own
// static page) and can search their sources, so a first visit shows a full shell. Saved, Weekly digest and Reading
// show as locked views that lead to sign-up, so a guest sees what an account adds. It reads nothing per request, so
// guest pages stay static. The rail's foot (the drawer's, on phones) holds the guest menu: a gentle way to an account.

import { AppShell } from '@/components/app-shell/app-shell';
import type { ShellCategory, ShellView } from '@/components/app-shell/nav-entries';
import type { SearchSource } from '@/components/app-shell/search-palette';
import { GuestMenu } from '@/features/auth/components/guest-menu';
import { GUEST_CATEGORIES, guestCategoryColor } from '@/features/categories/guest-categories';
import { ReaderSettings } from '@/features/preferences/components/reader-settings';

const GUEST_VIEWS = [
    { href: '/guest', label: 'All items', icon: 'all-items' },
    { href: '/sign-up', label: 'Saved', icon: 'saved', locked: true },
    { href: '/sign-up', label: 'Weekly digest', icon: 'digest', locked: true },
    { href: '/sign-up', label: 'Reading', icon: 'analytics', locked: true },
] satisfies ShellView[];

const GUEST_NAV = GUEST_CATEGORIES.map((category) => ({
    href: `/guest/c/${category.id}`,
    name: category.name,
    color: guestCategoryColor(category),
})) satisfies ShellCategory[];

const GUEST_SOURCES = GUEST_CATEGORIES.flatMap((category) =>
    category.sources.map((source) => ({ href: `/guest/c/${category.id}`, name: source, detail: category.name, categoryHref: `/guest/c/${category.id}` })),
) satisfies SearchSource[];

export default function GuestLayout({ children }: LayoutProps<'/guest'>) {
    return (
        <AppShell homeHref="/guest" views={GUEST_VIEWS} categories={GUEST_NAV} sources={GUEST_SOURCES} account={<GuestMenu />} utilities={<ReaderSettings />}>
            {children}
        </AppShell>
    );
}
