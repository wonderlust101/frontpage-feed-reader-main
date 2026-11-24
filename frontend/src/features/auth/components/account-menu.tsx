// The signed-in reader's account menu, anchored to the foot of the shell's rail (and of the drawer, where the button
// also shows the name and email): who is signed in, verify email (until verified), change password, and sign out.

import type { SessionUser } from '@frontpage/shared';
import { ShellMenu } from '@/components/app-shell/shell-menu';
import { TextLink } from '@/components/ui/text-link';
import { SignOutButton } from './sign-out-button';

type AccountMenuProps = {
    user: Pick<SessionUser, 'name' | 'email' | 'emailVerified'>;
};

export const ACCOUNT_TRIGGER_CLASSES =
    'flex items-center gap-3 rounded-control p-1 text-left transition-colors duration-150 hover:bg-ink/6 in-data-[account=row]:w-full in-data-[account=row]:p-2';

// Renders the avatar button and its panel for `user`.
export function AccountMenu({ user }: AccountMenuProps) {
    const initials = user.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');

    return (
        <ShellMenu
            label="Account"
            placement="beside"
            triggerClassName={ACCOUNT_TRIGGER_CLASSES}
            trigger={
                <>
                    <span
                        aria-hidden="true"
                        className="fill-edge grid size-9 flex-none place-items-center rounded-full bg-field-lemon text-meta font-bold text-on-field"
                    >
                        {initials}
                    </span>
                    <span className="hidden min-w-0 in-data-[account=row]:block">
                        <span className="block truncate text-ui font-semibold">{user.name}</span>
                        <span className="block truncate text-meta text-muted">{user.email}</span>
                    </span>
                    <span className="sr-only in-data-[account=row]:hidden">Account menu for {user.name}</span>
                    <span className="sr-only hidden in-data-[account=row]:block">, account menu</span>
                </>
            }
        >
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-meta text-muted">{user.email}</p>
            <ul className="mt-3 border-t border-edge pt-1">
                {!user.emailVerified && (
                    <li>
                        <TextLink href="/verify-email" standalone className="text-ui">
                            Verify email
                        </TextLink>
                    </li>
                )}
                <li>
                    <TextLink href="/account/password" standalone className="text-ui">
                        Change password
                    </TextLink>
                </li>
            </ul>
            <div className="mt-3">
                <SignOutButton />
            </div>
        </ShellMenu>
    );
}
