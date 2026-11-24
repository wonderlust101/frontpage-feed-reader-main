// The app shell around guest mode and the signed-in home, sidebar first: a rail (logo, views, the panel toggle, the
// account), the category panel beside it, and the workspace with its toolbar header (location, search, Aa) above the
// page's <main>. Three neutral steps get lighter toward the content. Below lg the rail and panel move into a drawer
// opened from the toolbar. Two skip links come first: to the content, and to search, which follows the sidebar in
// the tab order. Feature-agnostic: views, categories and search sources are plain data; each route's layout passes
// in `account` (shown in the rail's foot and the drawer's) and `utilities` (the toolbar's right end).

import type { ReactNode } from 'react';
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
    utilities: ReactNode;
    children: ReactNode;
};

const PANEL_ID = 'shell-categories';

const SKIP_LINK_CLASSES =
    'sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-ink focus:px-5 focus:py-3 focus:text-ui focus:font-semibold focus:text-ground';

// Renders the shell with the page (`children`) in the workspace.
export function AppShell({ homeHref, views, categories = [], sources, account, utilities, children }: AppShellProps) {
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
                className="sticky top-0 hidden h-dvh flex-none lg:grid"
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <ShellToolbar
                    views={views}
                    categories={categories}
                    sources={sources}
                    drawer={
                        <ShellDrawer>
                            <ShellNav homeHref={homeHref} views={views} categories={categories} account={account} />
                        </ShellDrawer>
                    }
                    utilities={utilities}
                />
                <main id="main" tabIndex={-1} className="min-w-0 flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
