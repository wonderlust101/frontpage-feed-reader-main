// The app shell for guests, around every /guest page. Guests get the curated sample categories (each with its own
// static page), recolor them on this device, and search their sources, so a first visit shows a full shell. What only
// an account adds (saved items, the weekly digest, reading stats) is one locked entry that leads to sign-up. It reads
// nothing per request, so guest pages stay static. The rail's foot (the drawer's, on phones) holds the guest menu.

import type { ShellView } from '@/components/app-shell/nav-entries';
import type { SearchSource } from '@/components/app-shell/search-palette';
import { GuestMenu } from '@/features/auth/components/guest-menu';
import { GUEST_CATEGORIES } from '@/features/categories/guest-categories';
import { GuestShell } from './_components/guest-shell';

const GUEST_VIEWS = [
    { href: '/guest', label: 'All items', icon: 'all-items' },
    { href: '/sign-up', label: 'Saved, digest and stats', icon: 'saved', locked: true },
] satisfies ShellView[];

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
