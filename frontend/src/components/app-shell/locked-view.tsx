// An account-only view as a guest sees it: a locked icon or row that opens a preview of the feature, so a guest can
// see what an account adds without leaving the page.

import Link from 'next/link';
import { buttonClassName } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { ShellView } from './nav-entries';
import { ShellMenu } from './shell-menu';
import { RAIL_BUTTON_CLASSES, RAIL_IDLE_CLASSES } from './rail-styles';
import { RailTooltip } from './rail-tooltip';

type LockedViewProps = {
    view: ShellView;
    preview: string;
    variant: 'rail' | 'row';
};

const TRIGGER_CLASSES = {
    rail: `${RAIL_BUTTON_CLASSES} ${RAIL_IDLE_CLASSES}`,
    row: 'flex min-h-11 w-full items-center gap-3 rounded-toggle px-3 text-left text-ui font-medium text-ink-2 transition-colors duration-150 hover:bg-ink/6 hover:text-ink',
};

export function LockedView({ view, preview, variant }: LockedViewProps) {
    const railTrigger = (
        <>
            <Icon name={view.icon} />
            <span aria-hidden="true" className="absolute right-1 bottom-1 grid size-4 place-items-center rounded-full bg-rail text-ink-2">
                <Icon name="locked" size="inline" className="size-3" />
            </span>
            <span className="sr-only">{view.label}, with an account</span>
            <RailTooltip>
                {view.label}
                <span className="ml-1.5 font-normal">· with an account</span>
            </RailTooltip>
        </>
    );

    const rowTrigger = (
        <>
            <Icon name={view.icon} />
            <span className="min-w-0 truncate">{view.label}</span>
            <span className="ml-auto flex">
                <Icon name="locked" size="inline" />
            </span>
            <span className="sr-only">, with an account</span>
        </>
    );

    return (
        <ShellMenu
            label={view.label}
            placement="row"
            triggerClassName={TRIGGER_CLASSES[variant]}
            trigger={variant === 'rail' ? railTrigger : rowTrigger}
        >
            <div className="flex items-center gap-3">
                <span aria-hidden="true" className="grid size-10 flex-none place-items-center rounded-control bg-field-lemon text-on-field">
                    <Icon name={view.icon} />
                </span>
                <p className="font-display text-title leading-tight font-bold tracking-[-0.02em]">{view.label}</p>
            </div>
            <p className="mt-3 text-ui text-ink-2">{preview}</p>
            <p className="mt-3 flex items-center gap-1.5 text-meta font-semibold text-ink-2">
                <Icon name="locked" size="inline" />
                Comes with an account
            </p>
            <Link href={view.href} className={buttonClassName('primary', 'mt-4')}>
                Create account
            </Link>
        </ShellMenu>
    );
}
