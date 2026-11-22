'use client';

// Verify-email flow: the reader types the 6-digit code from their email. The address comes from sign-up or sign-in
// (sessionStorage) or from the signed-in session; if neither has it, the page asks for it and sends a code first.
// Signed-in readers can leave it for later. Until the API's email-code plugin exists, its requests fail with a general error.
// The email step has its own heading ("Where should the code go?"); the code step's description says where the code
// went and how long it lasts. Arriving at the code
// step from the email step puts focus in the code field, and a resent code's notice takes focus.

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useAuthHeading } from './auth-heading';
import { FormNotice } from './form-notice';
import { TextField } from '@/components/ui/text-field';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { authErrorMessage } from '../error-messages';
import { forgetPendingEmail, readPendingEmail, rememberPendingEmail } from '../pending-email';
import { CODE_LENGTH, codeSchema, emailSchema } from '../schemas';
import { rememberSignInEmail } from '../sign-in-email';
import { FormAlert } from './form-alert';
import { SubmitButton } from './submit-button';

type EmailValues = z.infer<typeof emailSchema>;

type CodeValues = z.input<typeof codeSchema>;

type CodeStepProps = {
    email: string;
    signedIn: boolean;
    focusCode: boolean;
    onChangeEmail: () => void;
};

const EMAIL_STEP_HEADING = { title: 'Where should the code go?', description: "Pop in your email and we'll send six digits over." };

const RESEND_COOLDOWN_SECONDS = 60;

// How long a code lasts: the API's email-code plugin default (expiresIn, 300 seconds).
const CODE_LIFETIME_MINUTES = 5;

const CODE_FIELD_CODES = ['INVALID_OTP', 'OTP_EXPIRED', 'TOO_MANY_ATTEMPTS'];

const LINK_CLASSES = 'text-ui font-semibold underline decoration-1 underline-offset-4 hover:decoration-2';

// Renders the code step when the address is known, else the email step; offers "Do this later" when signed in.
export function VerifyEmailForm() {
    const { data: session } = authClient.useSession();
    const storedEmail = useSyncExternalStore(subscribeToNothing, readPendingEmail, () => null);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [changingEmail, setChangingEmail] = useState(false);

    const email = changingEmail ? null : (sentTo ?? storedEmail ?? session?.user.email ?? null);
    const signedIn = Boolean(session);

    return (
        <div className="flex flex-col gap-8">
            {email ? (
                <CodeStep email={email} signedIn={signedIn} focusCode={sentTo !== null} onChangeEmail={() => setChangingEmail(true)} />
            ) : (
                <EmailStep
                    onSent={(sentTo) => {
                        rememberPendingEmail(sentTo);
                        setSentTo(sentTo);
                        setChangingEmail(false);
                    }}
                />
            )}
            {signedIn && (
                <p className="text-ui text-ink-2">
                    Not now?{' '}
                    <Link href="/user" className={LINK_CLASSES}>
                        Do this later
                    </Link>
                </p>
            )}
        </div>
    );
}

// Asks for the address and sends a code to it, then hands the address back through `onSent`.
function EmailStep({ onSent }: { onSent: (email: string) => void }) {
    useAuthHeading(EMAIL_STEP_HEADING);
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' }, reValidateMode: 'onChange' });

    async function sendCode({ email }: EmailValues) {
        const { failure } = await authRequest((fetchOptions) => authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }, fetchOptions));
        if (failure) {
            setError('root', { message: authErrorMessage(failure) });
            return;
        }
        onSent(email);
    }

    return (
        <form noValidate onSubmit={handleSubmit(sendCode)} className="flex flex-col gap-6">
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

// Takes the code for `email`, verifies it, and offers a new code (at most once a minute) or a different address.
// `focusCode` puts focus in the code field on arrival (after the email step sent a code).
function CodeStep({ email, signedIn, focusCode, onChangeEmail }: CodeStepProps) {
    const router = useRouter();
    const [cooldown, setCooldown] = useState(0);
    const [resentCount, setResentCount] = useState(0);
    useAuthHeading({
        title: 'Confirm your email',
        description: `We sent a ${CODE_LENGTH}-digit code to ${email}. It expires in ${CODE_LIFETIME_MINUTES} minutes.`,
    });
    const {
        register,
        handleSubmit,
        setError,
        setFocus,
        formState: { errors, isSubmitting },
    } = useForm<CodeValues, unknown, z.output<typeof codeSchema>>({
        resolver: zodResolver(codeSchema),
        defaultValues: { code: '' },
        reValidateMode: 'onChange',
    });

    useEffect(() => {
        if (focusCode) {
            setFocus('code');
        }
    }, [focusCode, setFocus]);

    useEffect(() => {
        if (cooldown === 0) {
            return;
        }
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
        const signsInNext = !result.data?.token && !signedIn;
        if (signsInNext) {
            rememberSignInEmail(email);
        }
        router.replace(signsInNext ? '/sign-in?verified=1' : '/user');
        router.refresh();
    }

    async function resend() {
        const { failure } = await authRequest((fetchOptions) => authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }, fetchOptions));
        if (failure) {
            setError('root', { message: authErrorMessage(failure) });
            return;
        }
        setResentCount(resentCount + 1);
        setCooldown(RESEND_COOLDOWN_SECONDS);
    }

    return (
        <form noValidate onSubmit={handleSubmit(verify)} className="flex flex-col gap-6">
            {errors.root?.message ? (
                <FormAlert lead="Couldn't confirm your email." message={errors.root.message} />
            ) : (
                resentCount > 0 && (
                    <FormNotice icon="newsletter" lead="New code sent." focusKey={resentCount}>
                        Use the code in the newest email; older ones stop working.
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
                {...register('code')}
            />

            <SubmitButton pending={isSubmitting} pendingLabel="Checking…">
                Confirm email
            </SubmitButton>

            <div className="flex flex-col gap-1">
                <p className="text-ui text-ink-2">No code yet? Peek in your spam folder, then send a new one or try another address.</p>
                <div className="flex flex-wrap items-center gap-x-6">
                    <Button variant="quiet" onClick={resend} disabled={cooldown > 0}>
                        {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
                    </Button>
                    <Button variant="quiet" onClick={onChangeEmail}>
                        Use a different email
                    </Button>
                </div>
            </div>
        </form>
    );
}

// sessionStorage has no change events within a tab, so there is nothing to subscribe to; useSyncExternalStore still
// reads it safely (null on the server, the stored address once the page runs in the browser).
function subscribeToNothing(): () => void {
    return () => {};
}
