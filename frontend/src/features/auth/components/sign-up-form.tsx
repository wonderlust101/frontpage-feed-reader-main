'use client';

// The verify page gets the address through sessionStorage, not the URL. An email that already has an account gets
// links to sign in or reset, and either one carries the email over.

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod/mini';
import { PasswordField } from '@/components/ui/password-field';
import { TextLink } from '@/components/ui/text-link';
import { TextField } from '@/components/ui/text-field';
import { FormAlert } from '@/components/ui/form-alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { authErrorMessage } from '../error-messages';
import { rememberPendingEmail, rememberSignInEmail } from '../email-storage';
import { signUpSchema, NEW_PASSWORD_HINT } from '../schemas';

type SignUpValues = z.infer<typeof signUpSchema>;

const EMAIL_TAKEN_CODES = ['USER_ALREADY_EXISTS', 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'];

// The password is cleared after any failure, as in the other auth forms.
export function SignUpForm() {
    const router = useRouter();
    const [takenEmail, setTakenEmail] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        setError,
        resetField,
        formState: { errors, isSubmitting },
    } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema), defaultValues: { name: '', email: '', password: '' }, reValidateMode: 'onChange' });

    async function signUp(values: SignUpValues) {
        const { failure } = await authRequest((fetchOptions) => authClient.signUp.email(values, fetchOptions));

        if (failure) {
            resetField('password');
            setTakenEmail(failure.code && EMAIL_TAKEN_CODES.includes(failure.code) ? values.email : null);
            setError('root', { message: authErrorMessage(failure) });

            return;
        }

        rememberPendingEmail(values.email);
        router.push('/verify-email');
    }

    return (
        <form noValidate method="post" onSubmit={handleSubmit(signUp)} className="flex flex-col gap-6">
            {errors.root?.message && (
                <FormAlert
                    lead="Couldn't create your account."
                    message={errors.root.message}
                    action={
                        takenEmail && (
                            <span className="flex flex-wrap gap-x-6">
                                <TextLink href="/sign-in" standalone className="text-ui" onClick={() => rememberSignInEmail(takenEmail)}>
                                    Sign in
                                </TextLink>
                                <TextLink href="/forgot-password" standalone className="text-ui" onClick={() => rememberSignInEmail(takenEmail)}>
                                    Reset password
                                </TextLink>
                            </span>
                        )
                    }
                />
            )}

            <TextField aria-required id="name" label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
            <TextField
                aria-required
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                error={errors.email?.message}
                {...register('email')}
            />
            <PasswordField
                aria-required
                id="password"
                label="Password"
                hint={NEW_PASSWORD_HINT}
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
            />

            <SubmitButton pending={isSubmitting} pendingLabel="Creating your account…">
                Create account
            </SubmitButton>
        </form>
    );
}
