'use client';

// The result is the same whether or not the address has an account, so the page never reveals who is signed up.
// The reset link must be absolute: Better Auth resolves relative ones against the API's domain.

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod/mini';
import { Button } from '@/components/ui/button';
import { FormNotice } from '@/components/ui/form-notice';
import { FormAlert } from '@/components/ui/form-alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { authErrorMessage } from '../error-messages';
import { FORGOT_PASSWORD_HEADINGS } from '../headings';
import { emailSchema } from '../schemas';
import { readSignInEmail, rememberSignInEmail } from '../email-storage';
import { useAuthHeading } from './auth-heading';
import { EmailField } from './email-field';

type EmailValues = z.infer<typeof emailSchema>;

export function ForgotPasswordForm() {
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [returning, setReturning] = useState(false);
    const { data: session } = authClient.useSession();

    useAuthHeading(sentTo ? FORGOT_PASSWORD_HEADINGS.sent : null);
    const {
        register,
        handleSubmit,
        setError,
        setFocus,
        setValue,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' }, reValidateMode: 'onChange' });
    const knownEmail = session?.user.email;

    useEffect(() => {
        const email = readSignInEmail() ?? knownEmail;

        if (email && !getValues('email'))
            setValue('email', email);
    }, [knownEmail, getValues, setValue]);

    useEffect(() => {
        if (returning && !sentTo)
            setFocus('email', { shouldSelect: true });
    }, [returning, sentTo, setFocus]);

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
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setSentTo(null);
                            setReturning(true);
                        }}
                    >
                        Use another email
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form noValidate method="post" onSubmit={handleSubmit(requestLink)} className="flex flex-col gap-6">
            {errors.root?.message && <FormAlert lead="Couldn't send the link." message={errors.root.message} />}

            <EmailField error={errors.email?.message} {...register('email')} />

            <SubmitButton pending={isSubmitting} pendingLabel="Sending…">
                Send reset link
            </SubmitButton>
        </form>
    );
}
