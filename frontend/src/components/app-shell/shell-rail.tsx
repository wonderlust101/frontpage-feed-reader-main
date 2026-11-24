'use client';

// The rail (lg up): logo, view icons and the panel toggle. The home view's mark shows only while the panel is
// collapsed, because the open panel's "All items" row already marks the place.

import Link from 'next/link';
import { LogoMark } from '@/components/logo';
import { Icon } from '@/components/ui/icon';
import { LockedView } from './locked-view';
import { formatCount, type ShellView } from './nav-entries';
import { RailTooltip, SidebarToggle, useSidebar } from './sidebar-toggle';

type ShellRailProps = {
    homeHref: string;
    views: ShellView[];
    currentView: string | null;
    panelId: string;
};

const MARK_CLASSES = 'bg-field-lemon text-on-field shadow-[inset_0_0_0_1.5px_var(--color-on-field)]';

const IDLE_CLASSES = 'text-ink-2 hover:bg-ink/6 hover:text-ink';

const HOME_MARK_CLASSES = `${IDLE_CLASSES} sidebar-collapsed:bg-field-lemon sidebar-collapsed:text-on-field sidebar-collapsed:shadow-[inset_0_0_0_1.5px_var(--color-on-field)]`;

export function ShellRail({ homeHref, views, currentView, panelId }: ShellRailProps) {
    const [sidebar] = useSidebar();

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
                        const isHome = view.href === homeHref;
                        const marks = isCurrent ? (isHome ? HOME_MARK_CLASSES : MARK_CLASSES) : IDLE_CLASSES;
                        const shownCount = formatCount(view.count);

                        return (
                            <li key={view.label}>
                                {view.preview ? (
                                    <LockedView view={view} preview={view.preview} variant="rail" />
                                ) : (
                                    <Link
                                        href={view.href}
                                        aria-current={isCurrent && (!isHome || sidebar === 'collapsed') ? 'true' : undefined}
                                        className={`group relative grid size-11 place-items-center rounded-control transition-colors duration-150 ${marks}`}
                                    >
                                        <Icon name={view.icon} />
                                        <span className="sr-only">
                                            {view.label}
                                            {shownCount && `, ${shownCount} unread`}
                                        </span>
                                        <RailTooltip>
                                            {view.label}
                                            {shownCount && <span className="ml-1.5 font-normal">{shownCount}</span>}
                                        </RailTooltip>
                                    </Link>
                                )}
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
