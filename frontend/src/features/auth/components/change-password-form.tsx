'use client';

// Change-password form for signed-in readers: current password, new password, and whether to sign out other devices
// (on by default, in case the old password leaked). The current password is the security check; a reader who has
// forgotten it takes the reset route ("Forgot your current password?", which fills in their email there). If the
// session has ended meanwhile (signed out in another tab, or expired), the API answers UNAUTHORIZED and the reader is
// asked to sign in again. Success replaces the form with the result and one way on, so the ending isn't an armed,
// empty form under a "done" message: the heading says the password changed, one notice says what happened to the
// other devices, and "Back to your account" is the only link (the frame's own copy of it steps aside).

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod/mini';
import { buttonClassName } from '@/components/ui/button';
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
import { useAuthFrameLinks, useAuthHeading, type FrameLinks } from './auth-heading';

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const SIGN_IN_AGAIN_CODES = ['UNAUTHORIZED'];

const RESULT_LINKS: FrameLinks = { switchLink: null, guestLink: false };

// Renders the form, then the "password changed" heading, a notice (which takes focus) and a way back to the account;
// a wrong current password is reported on that field.
export function ChangePasswordForm() {
    const [changed, setChanged] = useState<{ signedOutOthers: boolean } | null>(null);
    const [needsSignIn, setNeedsSignIn] = useState(false);
    useAuthHeading(changed ? CHANGE_PASSWORD_HEADINGS.changed : null);
    useAuthFrameLinks(changed ? RESULT_LINKS : null);
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

    async function changePassword(values: ChangePasswordValues) {
        const { failure } = await authRequest((fetchOptions) => authClient.changePassword(values, fetchOptions));
        if (failure) {
            resetField('currentPassword');
            resetField('newPassword');
            setNeedsSignIn(Boolean(failure.code && SIGN_IN_AGAIN_CODES.includes(failure.code)));
            const field = failure.code === 'INVALID_PASSWORD' ? 'currentPassword' : 'root';
            setError(field, { message: authErrorMessage(failure) }, { shouldFocus: true });
            return;
        }
        setChanged({ signedOutOthers: values.revokeOtherSessions });
    }

    if (changed) {
        return (
            <div className="flex flex-col gap-6">
                <FormNotice icon="healthy" lead={changed.signedOutOthers ? 'Other devices are signed out.' : 'Other devices stay signed in.'} takesFocus>
                    {changed.signedOutOthers ? 'This one stays signed in.' : 'They keep working until they sign out.'}
                </FormNotice>
                <Link href="/user" className={buttonClassName('primary', 'w-full justify-center')}>
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
