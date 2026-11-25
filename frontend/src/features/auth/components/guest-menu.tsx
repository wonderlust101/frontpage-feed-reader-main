// A gentle nudge where a reader's account menu sits; it never blocks, and guests read freely without it.

import Link from 'next/link';
import { ShellMenu } from '@/components/app-shell/shell-menu';
import { buttonClassName } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TextLink } from '@/components/ui/text-link';
import { ACCOUNT_TRIGGER_CLASSES, AccountTrigger } from './account-trigger';

const GUEST_AVATAR = (
    <span aria-hidden="true" className="grid size-9 flex-none place-items-center rounded-full border-[1.5px] border-dashed border-control-edge text-ink-2">
        <Icon name="guest" size="inline" />
    </span>
);

export function GuestMenu() {
    return (
        <ShellMenu
            label="Guest"
            placement="beside"
            triggerClassName={ACCOUNT_TRIGGER_CLASSES}
            trigger={
                <AccountTrigger
                    avatar={GUEST_AVATAR}
                    title="Guest"
                    subtitle="Create account · Sign in"
                    railLabel="Guest menu"
                    tooltip="Guest · Create account or sign in"
                    rowLabelSuffix=", guest menu"
                />
            }
        >
            <p className="font-semibold">You’re reading as a guest</p>
            <p className="mt-1 text-meta text-ink-2">Pull up a chair. An account keeps your feeds, colors and saved items right where you left them.</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link href="/sign-up" className={buttonClassName('primary')}>
                    Create account
                </Link>
                <TextLink href="/sign-in" standalone className="text-ui">
                    Sign in
                </TextLink>
            </div>
        </ShellMenu>
    );
}
