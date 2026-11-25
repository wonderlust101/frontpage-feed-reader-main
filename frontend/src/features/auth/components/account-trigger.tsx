// The avatar button shared by the account and guest menus: an icon in the rail (named by a tooltip and an sr-only
// label), a full row with title and subtitle in the drawer.

import type { ReactNode } from 'react';
import { RailTooltip } from '@/components/app-shell/rail-tooltip';

type AccountTriggerProps = {
    avatar: ReactNode;
    title: string;
    subtitle: string;
    railLabel: string;
    tooltip: string;
    rowLabelSuffix: string;
};

export const ACCOUNT_TRIGGER_CLASSES =
    'group relative flex items-center gap-3 rounded-control p-1 text-left transition-colors duration-150 hover:bg-ink/6 in-data-[account=row]:w-full in-data-[account=row]:p-2';

export function AccountTrigger({ avatar, title, subtitle, railLabel, tooltip, rowLabelSuffix }: AccountTriggerProps) {
    return (
        <>
            {avatar}
            <span className="hidden min-w-0 in-data-[account=row]:block">
                <span className="block truncate text-ui font-semibold">{title}</span>
                <span className="block truncate text-meta text-muted">{subtitle}</span>
            </span>
            <span className="sr-only in-data-[account=row]:hidden">{railLabel}</span>
            <span className="contents in-data-[account=row]:hidden">
                <RailTooltip>{tooltip}</RailTooltip>
            </span>
            <span className="sr-only hidden in-data-[account=row]:block">{rowLabelSuffix}</span>
        </>
    );
}
