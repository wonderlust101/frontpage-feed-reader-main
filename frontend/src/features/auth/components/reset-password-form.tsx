'use client';

// Reset-password form, opened from the emailed link. The token arrives in the URL; once read, it is removed from the
// address bar so it doesn't linger in history or get copied along with the address. Success signs every session out
// (the API revokes them), so the reader goes to sign-in with a "password changed" notice.

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { PasswordField } from '@/components/ui/password-field';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { authErrorMessage } from '../error-messages';
import { MIN_PASSWORD_LENGTH, resetPasswordSchema } from '../schemas';
import { FormAlert } from './form-alert';
import { SubmitButton } from './submit-button';

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
        <form noValidate onSubmit={handleSubmit(resetPassword)} className="flex flex-col gap-6">
            {errors.root?.message && (
                <FormAlert
                    lead="Couldn't change your password."
                    message={errors.root.message}
                    action={
                        <Link href="/forgot-password" className="text-ui font-semibold underline decoration-1 underline-offset-4 hover:decoration-2">
                            Get a new link
                        </Link>
                    }
                />
            )}

            <PasswordField
                id="password"
                label="New password"
                hint={`At least ${MIN_PASSWORD_LENGTH} characters. A short phrase beats a hard word.`}
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
