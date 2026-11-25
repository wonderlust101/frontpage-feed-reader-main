'use client';

// Signing out other devices is on by default, in case the old password leaked. Success replaces the form with the
// result and one way on, so the ending isn't an armed, empty form under a "done" message.

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod/mini';
import { buttonClassName } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormAlert } from '@/components/ui/form-alert';
import { FormNotice } from '@/components/ui/form-notice';
import { PasswordField } from '@/components/ui/password-field';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextLink } from '@/components/ui/text-link';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { authErrorMessage } from '../error-messages';
import { CHANGE_PASSWORD_HEADINGS } from '../headings';
import { useAuthFrameLinks, useAuthHeading, type FrameLinks } from '../hooks/use-auth-step';
import { ACCOUNT_HOME } from '../redirect-target';
import { changePasswordSchema, NEW_PASSWORD_HINT } from '../schemas';

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const OTHER_DEVICES_NOTICE = {
    signedOut: { lead: 'Other devices are signed out.', detail: 'This one stays signed in.' },
    stillSignedIn: { lead: 'Other devices stay signed in.', detail: 'They keep working until they sign out.' },
};

const RESULT_LINKS: FrameLinks = { switchLink: null, guestLink: false };

export function ChangePasswordForm() {
    const [changed, setChanged] = useState<{ signedOutOthers: boolean } | null>(null);
    const [needsSignIn, setNeedsSignIn] = useState(false);

    const {
        register,
        handleSubmit,
        setError,
        resetField,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { currentPassword: '', newPassword: '', revokeOtherSessions: true },
        reValidateMode: 'onChange',
    });

    useAuthHeading(changed ? CHANGE_PASSWORD_HEADINGS.changed : null);
    useAuthFrameLinks(changed ? RESULT_LINKS : null);

    async function changePassword(values: ChangePasswordValues) {
        const { failure } = await authRequest((fetchOptions) => authClient.changePassword(values, fetchOptions));

        if (failure) {
            resetField('currentPassword');
            resetField('newPassword');
            setNeedsSignIn(failure.code === 'UNAUTHORIZED');

            const field = failure.code === 'INVALID_PASSWORD' ? 'currentPassword' : 'root';

            setError(field, { message: authErrorMessage(failure) }, { shouldFocus: true });

            return;
        }

        setChanged({ signedOutOthers: values.revokeOtherSessions });
    }

    if (changed) {
        const notice = changed.signedOutOthers ? OTHER_DEVICES_NOTICE.signedOut : OTHER_DEVICES_NOTICE.stillSignedIn;

        return (
            <div className="flex flex-col gap-6">
                <FormNotice icon="healthy" lead={notice.lead} takesFocus>
                    {notice.detail}
                </FormNotice>
                <Link href={ACCOUNT_HOME} className={buttonClassName('primary', 'w-full justify-center')}>
                    Back to your account
                </Link>
            </div>
        );
    }

    return (
        <form noValidate method="post" onSubmit={handleSubmit(changePassword)} className="flex flex-col gap-6">
            {errors.root?.message && (
                <FormAlert
                    lead="Couldn't change your password."
                    message={errors.root.message}
                    action={
                        needsSignIn && (
                            <TextLink href="/sign-in?next=/account/password" standalone className="text-ui">
                                Sign in again
                            </TextLink>
                        )
                    }
                />
            )}

            <div className="flex flex-col gap-1">
                <PasswordField
                    aria-required
                    id="current-password"
                    label="Current password"
                    autoComplete="current-password"
                    error={errors.currentPassword?.message}
                    {...register('currentPassword')}
                />
                <p>
                    <TextLink href="/forgot-password" standalone className="text-ui">
                        Forgot your current password?
                    </TextLink>
                </p>
            </div>
            <PasswordField
                aria-required
                id="new-password"
                label="New password"
                hint={NEW_PASSWORD_HINT}
                autoComplete="new-password"
                error={errors.newPassword?.message}
                {...register('newPassword')}
            />
            <Checkbox
                id="revoke-other-sessions"
                label="Sign out other devices"
                hint="A good idea if someone else might know your old one."
                {...register('revokeOtherSessions')}
            />

            <SubmitButton pending={isSubmitting} pendingLabel="Saving…">
                Change password
            </SubmitButton>
        </form>
    );
}
