// The guest's menu, where a reader's account menu sits (the rail's foot, the drawer's): a "Guest" button opening what
// an account keeps and the ways in. A gentle nudge that never blocks; guests read freely without it.

import Link from 'next/link';
import { ShellMenu } from '@/components/app-shell/shell-menu';
import { buttonClassName } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TextLink } from '@/components/ui/text-link';
import { ACCOUNT_TRIGGER_CLASSES } from './account-menu';

// Renders the guest button and its panel.
export function GuestMenu() {
    return (
        <ShellMenu
            label="Guest"
            placement="beside"
            triggerClassName={ACCOUNT_TRIGGER_CLASSES}
            trigger={
                <>
                    <span
                        aria-hidden="true"
                        className="grid size-9 flex-none place-items-center rounded-full border-[1.5px] border-dashed border-control-edge text-ink-2"
                    >
                        <Icon name="guest" size="inline" />
                    </span>
                    <span className="sr-only in-data-[account=row]:not-sr-only in-data-[account=row]:min-w-0">
                        <span className="block text-ui font-semibold">Guest</span>
                        <span className="block text-meta text-muted">Create account · Sign in</span>
                    </span>
                    <span className="sr-only">, reading as a guest</span>
                </>
            }
        >
            <p className="font-semibold">Reading as a guest</p>
            <p className="mt-1 text-meta text-ink-2">Create an account to keep your feeds, colors and saved items.</p>
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
