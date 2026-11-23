// The app shell around guest mode and the signed-in home: a skip link, the sticky header, the ground-2 sidebar (lg up;
// a drawer below) and the sheet, the page's <main>, inset like a page on a tray. Feature-agnostic: the views are plain
// data, and each route's layout fills the header's `actions` and the sidebar's `foot` with feature pieces.

import type { ReactNode } from 'react';
import type { ShellView } from './nav-entries';
import { ShellDrawer } from './shell-drawer';
import { ShellHeader } from './shell-header';
import { ShellNav } from './shell-nav';

type AppShellProps = {
    homeHref: string;
    views: ShellView[];
    actions: ReactNode;
    foot?: ReactNode;
    children: ReactNode;
};

// Renders the shell with the page (`children`) in the sheet.
export function AppShell({ homeHref, views, actions, foot, children }: AppShellProps) {
    const nav = <ShellNav views={views} foot={foot} />;

    return (
        <div className="flex flex-1 flex-col bg-ground-2">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-field-lemon focus:px-5 focus:py-3 focus:text-ui focus:font-semibold focus:text-on-field"
            >
                Skip to content
            </a>
            <ShellHeader homeHref={homeHref} drawer={<ShellDrawer>{nav}</ShellDrawer>} actions={actions} className="sticky top-0 z-30" />
            <div className="grid flex-1 lg:grid-cols-[16rem_minmax(0,1fr)]">
                <div className="sticky top-19 hidden h-[calc(100dvh-4.75rem)] self-start overflow-y-auto pt-6 pb-5 pl-4 lg:block">{nav}</div>
                <main id="main" tabIndex={-1} className="min-w-0 bg-ground lg:mt-3 lg:mr-3 lg:rounded-t-stage lg:border lg:border-b-0 lg:border-edge">
                    {children}
                </main>
            </div>
        </div>
    );
}
