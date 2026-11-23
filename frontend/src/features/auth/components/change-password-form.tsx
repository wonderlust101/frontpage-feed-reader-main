'use client';

// Change-password form for signed-in readers: current password, new password, and whether to sign out other devices
// (on by default, in case the old password leaked). Better Auth only allows this on a recent sign-in; an older session
// is asked to sign in again first.

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { TextLink } from '@/components/ui/text-link';
import { FormNotice } from '@/components/ui/form-notice';
import { PasswordField } from '@/components/ui/password-field';
import { FormAlert } from '@/components/ui/form-alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { authErrorMessage } from '../error-messages';
import { CHANGE_PASSWORD_HEADINGS } from '../headings';
import { changePasswordSchema, NEW_PASSWORD_HINT } from '../schemas';
import { useAuthHeading } from './auth-heading';

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const SIGN_IN_AGAIN_CODES = ['SESSION_NOT_FRESH', 'SESSION_EXPIRED'];

// Renders the form, then a "password changed" heading and notice (which takes focus); a wrong current password is reported on that field.
export function ChangePasswordForm() {
    const [changed, setChanged] = useState<{ signedOutOthers: boolean } | null>(null);
    const [needsSignIn, setNeedsSignIn] = useState(false);
    useAuthHeading(changed ? CHANGE_PASSWORD_HEADINGS.changed : null);
    const {
        register,
        handleSubmit,
        setError,
        resetField,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { currentPassword: '', newPassword: '', revokeOtherSessions: true },
        reValidateMode: 'onChange',
    });

    async function changePassword(values: ChangePasswordValues) {
        setChanged(null);
        const { failure } = await authRequest((fetchOptions) => authClient.changePassword(values, fetchOptions));
        if (failure) {
            resetField('currentPassword');
            resetField('newPassword');
            setNeedsSignIn(Boolean(failure.code && SIGN_IN_AGAIN_CODES.includes(failure.code)));
            const field = failure.code === 'INVALID_PASSWORD' ? 'currentPassword' : 'root';
            setError(field, { message: authErrorMessage(failure) }, { shouldFocus: true });
            return;
        }
        reset();
        setChanged({ signedOutOthers: values.revokeOtherSessions });
    }

    return (
        <form noValidate onSubmit={handleSubmit(changePassword)} className="flex flex-col gap-6">
            {errors.root?.message ? (
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
            ) : (
                changed && (
                    <FormNotice
                        icon="healthy"
                        lead="All set."
                        key={String(changed.signedOutOthers)}
                        takesFocus
                        action={
                            <TextLink href="/user" standalone className="text-ui">
                                Back to your account
                            </TextLink>
                        }
                    >
                        {changed.signedOutOthers ? 'Your other devices are signed out.' : 'Use it next time you sign in.'}
                    </FormNotice>
                )
            )}

            <PasswordField
                aria-required
                id="current-password"
                label="Current password"
                autoComplete="current-password"
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
            />
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
