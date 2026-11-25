// The app shell around /guest and /user: rail, category panel and workspace toolbar, with a drawer below lg.
// Feature-agnostic: views, categories and sources are plain data; layouts pass `account` and an optional `rowMenu`.

import type { ReactNode } from 'react';
import type { RowMenu } from './category-list';
import type { ShellCategory, ShellView } from './nav-entries';
import type { SearchSource } from './search-results';
import { ShellDrawer } from './shell-drawer';
import { ShellNav } from './shell-nav';
import { ShellSidebar } from './shell-sidebar';
import { ShellToolbar } from './shell-toolbar';
import { SkipLink } from '@/components/ui/skip-link';

type AppShellProps = {
    homeHref: string;
    views: ShellView[];
    categories?: ShellCategory[];
    sources?: SearchSource[];
    account: ReactNode;
    rowMenu?: RowMenu;
    children: ReactNode;
};

const PANEL_ID = 'shell-categories';

export function AppShell({ homeHref, views, categories = [], sources, account, rowMenu, children }: AppShellProps) {
    return (
        <div className="flex flex-1 bg-workspace">
            <SkipLink href="#main" className="focus:top-3 focus:left-3">
                Skip to content
            </SkipLink>
            <SkipLink href="#shell-search" className="focus:top-3 focus:left-3">
                Skip to search
            </SkipLink>
            <ShellSidebar
                homeHref={homeHref}
                views={views}
                categories={categories}
                panelId={PANEL_ID}
                account={account}
                rowMenu={rowMenu}
                className="sticky top-0 hidden h-dvh flex-none lg:grid"
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <ShellToolbar
                    homeHref={homeHref}
                    views={views}
                    categories={categories}
                    sources={sources}
                    drawer={
                        <ShellDrawer>
                            <ShellNav homeHref={homeHref} views={views} categories={categories} account={account} rowMenu={rowMenu} />
                        </ShellDrawer>
                    }
                />
                <main id="main" tabIndex={-1} className="min-w-0 flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
