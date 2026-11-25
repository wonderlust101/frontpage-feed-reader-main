'use client';

// The code step shows only when a code is known to be on its way; otherwise the reader first gives an address.

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod/mini';
import { FormAlert } from '@/components/ui/form-alert';
import { FormSkeleton } from '@/components/ui/form-skeleton';
import { SubmitButton } from '@/components/ui/submit-button';
import { authClient, sendVerificationCode } from '../auth-client';
import { forgetPendingEmail, readPendingEmail, rememberPendingEmail } from '../email-storage';
import { authErrorMessage } from '../error-messages';
import { VERIFY_EMAIL_HEADINGS } from '../headings';
import { useAuthFrameLinks, useAuthHeading, type FrameLinks } from '../hooks/use-auth-step';
import { emailSchema } from '../schemas';
import { EmailField } from './email-field';
import { CodeStep } from './verify-email-code-step';

type EmailValues = z.infer<typeof emailSchema>;

type EmailStepProps = {
    defaultEmail: string;
    focusEmail: boolean;
    onSent: (email: string) => void;
};

const SIGNED_IN_LINKS: FrameLinks = {
    switchLink: { prompt: 'Not now?', label: 'Do this later', href: '/user', onClick: forgetPendingEmail },
    guestLink: false,
};

// A skeleton shows until storage and the session are read, so neither step flashes before the other.
export function VerifyEmailForm() {
    const { data: session, isPending } = authClient.useSession();
    const mounted = useSyncExternalStore(
        subscribeToNothing,
        () => true,
        () => false,
    );
    const storedEmail = useSyncExternalStore(subscribeToNothing, readPendingEmail, () => null);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [changingEmail, setChangingEmail] = useState(false);
    const signedIn = Boolean(session);

    useAuthFrameLinks(signedIn ? SIGNED_IN_LINKS : null);

    // Next keeps a visited page alive (hidden) after the reader leaves; forget this visit's code so the next visit
    // goes by storage alone.
    useLayoutEffect(() => {
        return function forgetThisVisit() {
            setSentTo(null);
            setChangingEmail(false);
        };
    }, []);

    function handleSent(address: string) {
        rememberPendingEmail(address);
        setSentTo(address);
        setChangingEmail(false);
    }

    if (!mounted || isPending)
        return <FormSkeleton fields={1} />;

    const codeSentTo = changingEmail ? null : (sentTo ?? storedEmail);

    if (codeSentTo)
        return <CodeStep email={codeSentTo} accountReady={signedIn && sentTo === null} onChangeEmail={() => setChangingEmail(true)} />;

    return <EmailStep defaultEmail={session?.user.email ?? ''} focusEmail={changingEmail} onSent={handleSent} />;
}

function EmailStep({ defaultEmail, focusEmail, onSent }: EmailStepProps) {
    useAuthHeading(VERIFY_EMAIL_HEADINGS.emailStep);

    const {
        register,
        handleSubmit,
        setError,
        setFocus,
        formState: { errors, isSubmitting },
    } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: defaultEmail }, reValidateMode: 'onChange' });

    useEffect(() => {
        if (focusEmail)
            setFocus('email', { shouldSelect: true });
    }, [focusEmail, setFocus]);

    async function sendCode({ email }: EmailValues) {
        const { failure } = await sendVerificationCode(email);

        if (failure) {
            setError('root', { message: authErrorMessage(failure) });

            return;
        }

        onSent(email);
    }

    return (
        <form noValidate method="post" onSubmit={handleSubmit(sendCode)} className="flex flex-col gap-6">
            {errors.root?.message && <FormAlert lead="Couldn't send a code." message={errors.root.message} />}
            <EmailField error={errors.email?.message} {...register('email')} />
            <SubmitButton pending={isSubmitting} pendingLabel="Sending…">
                Send code
            </SubmitButton>
        </form>
    );
}

// sessionStorage has no change events within a tab; useSyncExternalStore still reads it safely (null on the server),
// and the same trick tells the component whether it is running in the browser yet.
function subscribeToNothing(): () => void {
    return () => {};
}
