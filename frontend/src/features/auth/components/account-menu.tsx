// The header's account menu for a signed-in reader: who is signed in, the account actions that used to sit on the
// user page (verify email, shown until the email is verified, and change password), and sign out.

import type { SessionUser } from '@frontpage/shared';
import { ShellMenu } from '@/components/app-shell/shell-menu';
import { TextLink } from '@/components/ui/text-link';
import { SignOutButton } from './sign-out-button';

type AccountMenuProps = {
    user: Pick<SessionUser, 'name' | 'email' | 'emailVerified'>;
};

// Renders the account button and its panel for `user`.
export function AccountMenu({ user }: AccountMenuProps) {
    return (
        <ShellMenu id="account-menu" label="Account" icon="account">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-meta text-muted">{user.email}</p>
            <ul className="mt-3 rule-t pt-1">
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
