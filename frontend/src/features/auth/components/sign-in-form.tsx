'use client';

// Sign-in form: email and password. On success it goes to `next` (already checked to be a path on this site). The
// error alert carries the way out: an unverified email gets "Send a code" (it emails a new code and opens the verify
// page), and a wrong email or password gets "Forgot your password?". Arriving after a reset or a confirmed email is
// told by the page's heading (see the sign-in page), not by a notice here.

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { TextField } from '@/components/ui/text-field';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { authErrorMessage } from '../error-messages';
import { rememberPendingEmail } from '../pending-email';
import { signInSchema } from '../schemas';
import { FormAlert } from './form-alert';
import { SubmitButton } from './submit-button';

type SignInFormProps = {
    next: string;
};

type SignInValues = z.infer<typeof signInSchema>;

const LINK_CLASSES = 'inline-flex min-h-11 items-center text-ui font-semibold underline decoration-1 underline-offset-4 hover:decoration-2';

// Renders the form and the forgot-password link.
export function SignInForm({ next }: SignInFormProps) {
    const router = useRouter();
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
    const [wrongCredentials, setWrongCredentials] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const {
        register,
        handleSubmit,
        setError,
        resetField,
        formState: { errors, isSubmitting },
    } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' }, reValidateMode: 'onChange' });

    async function signIn(values: SignInValues) {
        const { failure } = await authRequest((fetchOptions) => authClient.signIn.email(values, fetchOptions));
        if (failure) {
            resetField('password');
            setUnverifiedEmail(failure.code === 'EMAIL_NOT_VERIFIED' ? values.email : null);
            setWrongCredentials(failure.code === 'INVALID_EMAIL_OR_PASSWORD');
            setError('root', { message: authErrorMessage(failure) });
            return;
        }
        router.replace(next);
        router.refresh();
    }

    async function sendCode(email: string) {
        setSendingCode(true);
        const { failure } = await authRequest((fetchOptions) => authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }, fetchOptions));
        setSendingCode(false);
        if (failure) {
            setError('root', { message: authErrorMessage(failure) });
            return;
        }
        rememberPendingEmail(email);
        router.push('/verify-email');
    }

    return (
        <form noValidate onSubmit={handleSubmit(signIn)} className="flex flex-col gap-6">
            {errors.root?.message && (
                <FormAlert
                    lead="Couldn't sign you in."
                    message={errors.root.message}
                    action={
                        unverifiedEmail ? (
                            <Button variant="secondary" disabled={sendingCode} onClick={() => sendCode(unverifiedEmail)}>
                                {sendingCode ? 'Sending…' : 'Send a code'}
                            </Button>
                        ) : (
                            wrongCredentials && (
                                <Link href="/forgot-password" className={`-my-3 ${LINK_CLASSES}`}>
                                    Forgot your password?
                                </Link>
                            )
                        )
                    }
                />
            )}

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
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
            />

            <SubmitButton pending={isSubmitting} pendingLabel="Signing in…">
                Sign in
            </SubmitButton>

            <p>
                <Link href="/forgot-password" className={`-my-3 ${LINK_CLASSES}`}>
                    Forgot your password?
                </Link>
            </p>
        </form>
    );
}
