'use client';

// The code step shows only when a code is known to be on its way; otherwise the reader first gives an address. While
// a code is being resent the button stays (busy), so focus doesn't drop.

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod/mini';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { FormNotice } from '@/components/ui/form-notice';
import { FormSkeleton } from '@/components/ui/form-skeleton';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextField } from '@/components/ui/text-field';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { forgetPendingEmail, readPendingEmail, rememberPendingEmail } from '../email-storage';
import { authErrorMessage } from '../error-messages';
import { codeStepHeading, VERIFY_EMAIL_HEADINGS } from '../headings';
import { CODE_LENGTH, codeSchema, emailSchema } from '../schemas';
import { useAuthDescriptionId, useAuthFrameLinks, useAuthHeading, type FrameLinks } from './auth-heading';

type EmailValues = z.infer<typeof emailSchema>;

type CodeValues = z.input<typeof codeSchema>;

type EmailStepProps = {
    defaultEmail: string;
    focusEmail: boolean;
    onSent: (email: string) => void;
};

type CodeStepProps = {
    email: string;
    accountReady: boolean;
    onChangeEmail: () => void;
};

const RESEND_COOLDOWN_SECONDS = 60;

const CODE_FIELD_CODES = ['INVALID_OTP', 'OTP_EXPIRED', 'TOO_MANY_ATTEMPTS'];

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
    useLayoutEffect(
        () => () => {
            setSentTo(null);
            setChangingEmail(false);
        },
        [],
    );

    if (!mounted || isPending)
        return <FormSkeleton fields={1} />;

    const codeSentTo = changingEmail ? null : (sentTo ?? storedEmail);

    return codeSentTo ? (
        <CodeStep email={codeSentTo} accountReady={signedIn && sentTo === null} onChangeEmail={() => setChangingEmail(true)} />
    ) : (
        <EmailStep
            defaultEmail={session?.user.email ?? ''}
            focusEmail={changingEmail}
            onSent={(address) => {
                rememberPendingEmail(address);
                setSentTo(address);
                setChangingEmail(false);
            }}
        />
    );
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
        const { failure } = await authRequest((fetchOptions) => authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }, fetchOptions));

        if (failure) {
            setError('root', { message: authErrorMessage(failure) });

            return;
        }

        onSent(email);
    }

    return (
        <form noValidate method="post" onSubmit={handleSubmit(sendCode)} className="flex flex-col gap-6">
            {errors.root?.message && <FormAlert lead="Couldn't send a code." message={errors.root.message} />}
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
                Send code
            </SubmitButton>
        </form>
    );
}

function CodeStep({ email, accountReady, onChangeEmail }: CodeStepProps) {
    const router = useRouter();
    const descriptionId = useAuthDescriptionId();
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
    const [resending, setResending] = useState(false);
    const [resentCount, setResentCount] = useState(0);

    useAuthHeading(codeStepHeading(email));
    const {
        register,
        handleSubmit,
        setError,
        clearErrors,
        setFocus,
        formState: { errors, isSubmitting },
    } = useForm<CodeValues, unknown, z.output<typeof codeSchema>>({
        resolver: zodResolver(codeSchema),
        defaultValues: { code: '' },
        reValidateMode: 'onChange',
    });

    useEffect(() => {
        setFocus('code');
    }, [setFocus]);

    useEffect(() => {
        if (cooldown === 0)
            return;

        const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);

        return () => clearTimeout(timer);
    }, [cooldown]);

    async function verify({ code }: z.output<typeof codeSchema>) {
        const result = await authRequest((fetchOptions) => authClient.emailOtp.verifyEmail({ email, otp: code }, fetchOptions));

        if (result.failure) {
            const field = result.failure.code && CODE_FIELD_CODES.includes(result.failure.code) ? 'code' : 'root';

            setError(field, { message: authErrorMessage(result.failure) }, { shouldFocus: true });

            return;
        }

        forgetPendingEmail();
        router.replace('/user');
        router.refresh();
    }

    async function resend() {
        clearErrors('root');
        setResending(true);
        const { failure } = await authRequest((fetchOptions) => authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }, fetchOptions));

        setResending(false);

        if (failure) {
            setError('root', { message: authErrorMessage(failure) });

            return;
        }

        rememberPendingEmail(email);
        setResentCount((count) => count + 1);
        setCooldown(RESEND_COOLDOWN_SECONDS);
    }

    return (
        <form noValidate method="post" onSubmit={handleSubmit(verify)} className="flex flex-col gap-6">
            {errors.root?.message ? (
                <FormAlert lead="Couldn't confirm your email." message={errors.root.message} />
            ) : resentCount > 0 ? (
                <FormNotice key={resentCount} icon="newsletter" lead="New code sent." takesFocus>
                    Use the code in the newest email; older ones stop working. You can send another in a minute.
                </FormNotice>
            ) : (
                accountReady && (
                    <FormNotice icon="healthy" lead="Account created.">
                        One last step: enter the code we emailed you.
                    </FormNotice>
                )
            )}

            <TextField
                aria-required
                id="code"
                label="Code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCapitalize="none"
                spellCheck={false}
                className="[&_input]:font-semibold [&_input]:tracking-[0.35em] [&_input]:tabular-nums [&_input]:text-title"
                error={errors.code?.message}
                {...register('code', {
                    // A paste or autofill drops the whole code in at once (it isn't typed text): confirm it straight away.
                    onChange: (event: { target: { value: string }; nativeEvent?: { inputType?: string } }) => {
                        const digits = event.target.value.replace(/\s/g, '');
                        const typed = event.nativeEvent?.inputType?.startsWith('insertText') || event.nativeEvent?.inputType?.startsWith('delete');

                        if (!typed && digits.length === CODE_LENGTH && /^\d+$/.test(digits) && !isSubmitting)
                            void handleSubmit(verify)();
                    },
                })}
                describedBy={descriptionId}
            />

            <SubmitButton pending={isSubmitting} pendingLabel="Checking…">
                Confirm email
            </SubmitButton>

            <div className="flex flex-col gap-1">
                <p className="text-ui text-ink-2">Didn&apos;t get it? Check your spam folder.</p>
                <div className="flex flex-wrap items-center gap-x-6">
                    {cooldown > 0 && !resending ? (
                        <span className="inline-flex h-11 items-center text-ui text-ink-2 tabular-nums">Send a new code in {cooldown}s</span>
                    ) : (
                        <Button
                            variant="quiet"
                            aria-disabled={resending || undefined}
                            aria-busy={resending || undefined}
                            onClick={resending ? undefined : resend}
                        >
                            {resending ? 'Sending a new code…' : 'Send a new code'}
                        </Button>
                    )}
                    <Button variant="quiet" onClick={onChangeEmail}>
                        Use a different email
                    </Button>
                </div>
            </div>
        </form>
    );
}

// sessionStorage has no change events within a tab; useSyncExternalStore still reads it safely (null on the server),
// and the same trick tells the component whether it is running in the browser yet.
function subscribeToNothing(): () => void {
    return () => {};
}
