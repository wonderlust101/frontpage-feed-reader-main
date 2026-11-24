'use client';

// The shell's rail (lg up): the Lemon logo tile linking home, the views as icon links with tooltips, and the toggle for
// the category panel; ShellSidebar puts the account at its foot. The current view is a Lemon square with an ink edge,
// the brand's own colour marking where you are (aria-current="true": the panel marks the page), and none is current
// inside a category. A locked view (a guest's account-only ones) carries a lock badge and a tooltip saying why.

import Link from 'next/link';
import { LogoMark } from '@/components/logo';
import { Icon } from '@/components/ui/icon';
import { formatCount, type ShellView } from './nav-entries';
import { RailTooltip, SidebarToggle } from './sidebar-toggle';

type ShellRailProps = {
    homeHref: string;
    views: ShellView[];
    currentView: string | null;
    panelId: string;
};

// Renders the rail's top: the logo, the views and the panel toggle.
export function ShellRail({ homeHref, views, currentView, panelId }: ShellRailProps) {
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
                        const isCurrent = view.href === currentView;
                        const shownCount = formatCount(view.count);
                        return (
                            <li key={view.label}>
                                <Link
                                    href={view.href}
                                    aria-current={isCurrent ? 'true' : undefined}
                                    className={`group relative grid size-11 place-items-center rounded-control transition-colors duration-150 ${isCurrent ? 'bg-field-lemon text-on-field shadow-[inset_0_0_0_1.5px_var(--color-on-field)]' : 'text-ink-2 hover:bg-ink/6 hover:text-ink'}`}
                                >
                                    <Icon name={view.icon} />
                                    {view.locked && (
                                        <span
                                            aria-hidden="true"
                                            className="absolute right-1 bottom-1 grid size-4 place-items-center rounded-full bg-rail text-ink-2"
                                        >
                                            <Icon name="locked" size="inline" className="size-3" />
                                        </span>
                                    )}
                                    <span className="sr-only">
                                        {view.label}
                                        {view.locked && ', with an account'}
                                        {shownCount && `, ${shownCount} unread`}
                                    </span>
                                    <RailTooltip>
                                        {view.label}
                                        {view.locked && <span className="ml-1.5 font-normal">· with an account</span>}
                                        {shownCount && <span className="ml-1.5 font-normal">{shownCount}</span>}
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
