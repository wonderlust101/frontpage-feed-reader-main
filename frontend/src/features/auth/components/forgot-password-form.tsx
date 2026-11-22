'use client';

// Forgot-password form: asks for an email and has the API send a reset link. The result is the same whether or not
// the address has an account, so the page never reveals who is signed up. The link returns to this site's
// /reset-password; the address must be absolute because Better Auth resolves relative ones against the API's domain.

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormNotice } from './form-notice';
import { TextField } from '@/components/ui/text-field';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { authErrorMessage } from '../error-messages';
import { emailSchema } from '../schemas';
import { FormAlert } from './form-alert';
import { SubmitButton } from './submit-button';

type EmailValues = z.infer<typeof emailSchema>;

// Renders the email form, then "check your inbox" once the request is accepted, with a way to try another address.
export function ForgotPasswordForm() {
    const [sentTo, setSentTo] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' }, reValidateMode: 'onChange' });

    async function requestLink({ email }: EmailValues) {
        const redirectTo = `${window.location.origin}/reset-password`;
        const { failure } = await authRequest((fetchOptions) => authClient.requestPasswordReset({ email, redirectTo }, fetchOptions));
        if (failure) {
            setError('root', { message: authErrorMessage(failure) });
            return;
        }
        setSentTo(email);
    }

    if (sentTo) {
        return (
            <div className="flex flex-col gap-6">
                <FormNotice icon="newsletter" lead="Check your inbox.">
                    If an account exists for {sentTo}, we&apos;ve sent it a link to choose a new password. The link works once and expires in 60 minutes.
                </FormNotice>
                <p className="text-ui text-ink-2">Nothing after a few minutes? Peek in your spam folder, or try another address.</p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <Button variant="secondary" onClick={() => setSentTo(null)}>
                        Use another email
                    </Button>
                    <Link href="/sign-in" className="text-ui font-semibold underline decoration-1 underline-offset-4 hover:decoration-2">
                        Back to sign in
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <form noValidate onSubmit={handleSubmit(requestLink)} className="flex flex-col gap-6">
            {errors.root?.message && <FormAlert lead="Couldn't send the link." message={errors.root.message} />}

            <TextField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                error={errors.email?.message}
                {...register('email')}
            />

            <SubmitButton pending={isSubmitting} pendingLabel="Sending…">
                Send reset link
            </SubmitButton>
        </form>
    );
}
