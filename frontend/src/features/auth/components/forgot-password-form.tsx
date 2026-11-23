'use client';

// Forgot-password form: asks for an email and has the API send a reset link. The result is the same whether or not
// the address has an account, so the page never reveals who is signed up. The link returns to this site's
// /reset-password; the address must be absolute because Better Auth resolves relative ones against the API's domain.
// Once sent, the page's heading turns to "Check your inbox" and the notice takes focus, so the change is announced.

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormNotice } from '@/components/ui/form-notice';
import { TextField } from '@/components/ui/text-field';
import { FormAlert } from '@/components/ui/form-alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { authErrorMessage } from '../error-messages';
import { FORGOT_PASSWORD_HEADINGS } from '../headings';
import { emailSchema } from '../schemas';
import { rememberSignInEmail } from '../email-storage';
import { useAuthHeading } from './auth-heading';

type EmailValues = z.infer<typeof emailSchema>;

// Renders the email form, then "check your inbox" once the request is accepted, with a way to try another address.
export function ForgotPasswordForm() {
    const [sentTo, setSentTo] = useState<string | null>(null);
    useAuthHeading(sentTo ? FORGOT_PASSWORD_HEADINGS.sent : null);
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
        rememberSignInEmail(email);
        setSentTo(email);
    }

    if (sentTo) {
        return (
            <div className="flex flex-col gap-6">
                <FormNotice icon="newsletter" lead={`Sent to ${sentTo}`} takesFocus>
                    If that address has an account, the link is waiting there now. It works once and lasts 60 minutes.
                </FormNotice>
                <p className="text-ui text-ink-2">Nothing after a few minutes? Peek in your spam folder, or try another address.</p>
                <div>
                    <Button variant="secondary" onClick={() => setSentTo(null)}>
                        Use another email
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form noValidate method="post" onSubmit={handleSubmit(requestLink)} className="flex flex-col gap-6">
            {errors.root?.message && <FormAlert lead="Couldn't send the link." message={errors.root.message} />}

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

            <SubmitButton pending={isSubmitting} pendingLabel="Sending…">
                Send reset link
            </SubmitButton>
        </form>
    );
}
