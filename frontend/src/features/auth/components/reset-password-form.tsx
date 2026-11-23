'use client';

// Reset-password form, opened from the emailed link. The token arrives in the URL; once read, it is removed from the
// address bar so it doesn't linger in history or get copied along with the address. Success signs every session out
// (the API revokes them), so the reader goes to sign-in, whose heading says the password changed and whose email
// field is filled in from the forgot-password step.

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { TextLink } from '@/components/ui/text-link';
import { PasswordField } from '@/components/ui/password-field';
import { FormAlert } from '@/components/ui/form-alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { authErrorMessage } from '../error-messages';
import { resetPasswordSchema, NEW_PASSWORD_HINT } from '../schemas';

type ResetPasswordFormProps = {
    token: string;
};

type ResetValues = z.infer<typeof resetPasswordSchema>;

// Renders the new-password form for `token`; an expired or used link is reported with a way to ask for a new one.
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
    const router = useRouter();
    const {
        register,
        handleSubmit,
        setError,
        resetField,
        formState: { errors, isSubmitting },
    } = useForm<ResetValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '' }, reValidateMode: 'onChange' });

    useEffect(() => {
        window.history.replaceState(null, '', '/reset-password');
    }, []);

    async function resetPassword({ password }: ResetValues) {
        const { failure } = await authRequest((fetchOptions) => authClient.resetPassword({ newPassword: password, token }, fetchOptions));
        if (failure) {
            resetField('password');
            setError('root', { message: authErrorMessage(failure) });
            return;
        }
        router.replace('/sign-in?reset=1');
    }

    return (
        <form noValidate method="post" onSubmit={handleSubmit(resetPassword)} className="flex flex-col gap-6">
            {errors.root?.message && (
                <FormAlert
                    lead="Couldn't change your password."
                    message={errors.root.message}
                    action={
                        <TextLink href="/forgot-password" standalone className="text-ui">
                            Get a new link
                        </TextLink>
                    }
                />
            )}

            <PasswordField
                aria-required
                id="password"
                label="New password"
                hint={NEW_PASSWORD_HINT}
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
            />

            <SubmitButton pending={isSubmitting} pendingLabel="Saving…">
                Save new password
            </SubmitButton>
        </form>
    );
}
