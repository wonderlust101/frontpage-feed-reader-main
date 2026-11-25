'use client';

// The rail (lg up): logo, view icons and the panel toggle. The home view's mark shows only while the panel is
// collapsed, because the open panel's "All items" row already marks the place.

import Link from 'next/link';
import { LogoMark } from '@/components/logo';
import { Icon } from '@/components/ui/icon';
import { LockedView } from './locked-view';
import { formatCount, type ShellView } from './nav-entries';
import { RAIL_BUTTON_CLASSES, RAIL_IDLE_CLASSES } from './rail-styles';
import { RailTooltip } from './rail-tooltip';
import { SidebarToggle, useSidebar } from './sidebar-toggle';

type ShellRailProps = {
    homeHref: string;
    views: ShellView[];
    currentView: string | null;
    panelId: string;
};

type RailViewLinkProps = {
    view: ShellView;
    isCurrent: boolean;
    isHome: boolean;
};

const MARK_CLASSES = 'bg-field-lemon text-on-field shadow-[inset_0_0_0_1.5px_var(--color-on-field)]';

const HOME_MARK_CLASSES = `${RAIL_IDLE_CLASSES} sidebar-collapsed:bg-field-lemon sidebar-collapsed:text-on-field sidebar-collapsed:shadow-[inset_0_0_0_1.5px_var(--color-on-field)]`;

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
                    {views.map((view) => (
                        <li key={view.label}>
                            {view.preview ? (
                                <LockedView view={view} preview={view.preview} variant="rail" />
                            ) : (
                                <RailViewLink view={view} isCurrent={view.href === currentView} isHome={view.href === homeHref} />
                            )}
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="mt-1 border-t border-edge pt-2">
                <SidebarToggle panelId={panelId} />
            </div>
        </div>
    );
}

function RailViewLink({ view, isCurrent, isHome }: RailViewLinkProps) {
    const [sidebar] = useSidebar();
    const shownCount = formatCount(view.count);
    const isMarkedCurrent = isCurrent && (!isHome || sidebar === 'collapsed');

    return (
        <Link href={view.href} aria-current={isMarkedCurrent ? 'true' : undefined} className={`${RAIL_BUTTON_CLASSES} ${markClasses(isCurrent, isHome)}`}>
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
    );
}

// The home mark follows the panel through a CSS variant, so it is right from the first paint, before `sidebar` is read.
function markClasses(isCurrent: boolean, isHome: boolean): string {
    if (!isCurrent)
        return RAIL_IDLE_CLASSES;

    return isHome ? HOME_MARK_CLASSES : MARK_CLASSES;
}
