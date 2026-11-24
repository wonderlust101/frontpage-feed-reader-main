'use client';

// The shell's rail (lg up): the Lemon logo tile linking home, the views as icon links with tooltips, the toggle for the
// category panel. ShellSidebar puts the account at its foot. The current view sits on a workspace square with a Lemon dot.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoMark } from '@/components/logo';
import { Icon } from '@/components/ui/icon';
import { currentHref, formatCount, type ShellView } from './nav-entries';
import { RailTooltip, SidebarToggle } from './sidebar-toggle';

type ShellRailProps = {
    homeHref: string;
    views: ShellView[];
    panelId: string;
};

// Renders the rail's top: the logo, the views and the panel toggle.
export function ShellRail({ homeHref, views, panelId }: ShellRailProps) {
    const current = currentHref(
        usePathname(),
        views.map((view) => view.href),
    );

    return (
        <div className="flex w-16 flex-none flex-col items-center gap-2 bg-rail pt-3">
            <Link href={homeHref} className="group relative mb-2 rounded-control">
                <LogoMark size={36} />
                <span className="sr-only">Frontpage home</span>
                <RailTooltip>Frontpage</RailTooltip>
            </Link>
            <nav aria-label="Views">
                <ul className="flex flex-col gap-1">
                    {views.map((view) => {
                        const isCurrent = view.href === current;
                        const shownCount = formatCount(view.count);
                        return (
                            <li key={view.href}>
                                <Link
                                    href={view.href}
                                    aria-current={isCurrent ? 'page' : undefined}
                                    className={`group relative grid size-11 place-items-center rounded-control transition-colors duration-150 ${isCurrent ? 'bg-workspace text-ink shadow-[inset_0_0_0_1px_var(--color-edge)]' : 'text-ink-2 hover:bg-ink/6 hover:text-ink'}`}
                                >
                                    <Icon name={view.icon} />
                                    {isCurrent && (
                                        <span aria-hidden="true" className="nav-marker fill-edge absolute bottom-1 size-1.5 rounded-full bg-field-lemon" />
                                    )}
                                    <span className="sr-only">
                                        {view.label}
                                        {shownCount && `, ${shownCount} unread`}
                                    </span>
                                    <RailTooltip>
                                        {view.label}
                                        {shownCount && <span className="ml-1.5 font-normal tabular-nums">{shownCount}</span>}
                                    </RailTooltip>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <div className="mt-1 border-t border-edge pt-2">
                <SidebarToggle panelId={panelId} />
            </div>
        </div>
    );
}
