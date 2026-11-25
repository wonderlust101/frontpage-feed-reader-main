'use client';

// "Send a code" for an unverified email is kept for when the API turns on requireEmailVerification; today it never
// sends EMAIL_NOT_VERIFIED. The arrival (?reset=1) is dropped from the URL, so a refresh is a plain sign-in.

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod/mini';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { PasswordField } from '@/components/ui/password-field';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextLink } from '@/components/ui/text-link';
import { authClient, sendVerificationCode } from '../auth-client';
import { authRequest } from '../auth-request';
import { rememberPendingEmail, takeSignInEmail } from '../email-storage';
import { authErrorMessage } from '../error-messages';
import { SIGN_IN_HEADINGS, type SignInArrival } from '../headings';
import { useAuthHeading } from '../hooks/use-auth-step';
import { signInSchema } from '../schemas';
import { EmailField } from './email-field';

type SignInFormProps = {
    next: string;
    arrival: SignInArrival;
};

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm({ next, arrival }: SignInFormProps) {
    const router = useRouter();
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
    const [wrongCredentials, setWrongCredentials] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [attemptFailed, setAttemptFailed] = useState(false);

    const {
        register,
        handleSubmit,
        setError,
        setFocus,
        setValue,
        resetField,
        formState: { errors, isSubmitting },
    } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' }, reValidateMode: 'onChange' });

    useAuthHeading(arrival && attemptFailed ? SIGN_IN_HEADINGS.default : null);

    useEffect(() => {
        // Every visit clears a saved email, so an old one never lingers on a shared device.
        const email = takeSignInEmail();

        if (arrival) {
            const url = new URL(window.location.href);

            url.searchParams.delete('reset');
            window.history.replaceState(null, '', url);
        }

        if (email) {
            setValue('email', email);
            setFocus('password');
        }
    }, [arrival, setValue, setFocus]);

    async function signIn(values: SignInValues) {
        const { failure } = await authRequest((fetchOptions) => authClient.signIn.email(values, fetchOptions));

        if (failure) {
            resetField('password');
            setAttemptFailed(true);
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

        const { failure } = await sendVerificationCode(email);

        setSendingCode(false);

        if (failure) {
            setError('root', { message: authErrorMessage(failure) });

            return;
        }

        rememberPendingEmail(email);
        router.push('/verify-email');
    }

    const forgotPasswordLink = (
        <TextLink href="/forgot-password" standalone className="-my-3 text-ui">
            Forgot your password?
        </TextLink>
    );

    const forgotLinkInAlert = Boolean(errors.root) && wrongCredentials;

    let failureAction: ReactNode = null;

    if (unverifiedEmail) {
        failureAction = (
            <Button variant="secondary" disabled={sendingCode} aria-busy={sendingCode || undefined} onClick={() => sendCode(unverifiedEmail)}>
                {sendingCode ? 'Sending…' : 'Send a code'}
            </Button>
        );
    } else if (wrongCredentials) {
        failureAction = forgotPasswordLink;
    }

    return (
        <form noValidate method="post" onSubmit={handleSubmit(signIn)} className="flex flex-col gap-6">
            {errors.root?.message && (
                <FormAlert lead="Couldn't sign you in." message={errors.root.message} action={failureAction} />
            )}

            <EmailField error={errors.email?.message} {...register('email')} />
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

            {!forgotLinkInAlert && <p>{forgotPasswordLink}</p>}
        </form>
    );
}
