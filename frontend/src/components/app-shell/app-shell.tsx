// The app shell around /guest and /user: rail, category panel and workspace toolbar, with a drawer below lg.
// Feature-agnostic: views, categories and sources are plain data; layouts pass `account` and an optional `rowMenu`.

import type { ReactNode } from 'react';
import type { RowMenu } from './category-list';
import type { ShellCategory, ShellView } from './nav-entries';
import type { SearchSource } from './search-palette';
import { ShellDrawer } from './shell-drawer';
import { ShellNav } from './shell-nav';
import { ShellSidebar } from './shell-sidebar';
import { ShellToolbar } from './shell-toolbar';

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

const SKIP_LINK_CLASSES =
    'sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-ink focus:px-5 focus:py-3 focus:text-ui focus:font-semibold focus:text-ground';

export function AppShell({ homeHref, views, categories = [], sources, account, rowMenu, children }: AppShellProps) {
    return (
        <div className="flex flex-1 bg-workspace">
            <a href="#main" className={SKIP_LINK_CLASSES}>
                Skip to content
            </a>
            <a href="#shell-search" className={SKIP_LINK_CLASSES}>
                Skip to search
            </a>
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
