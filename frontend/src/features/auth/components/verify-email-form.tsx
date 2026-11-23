'use client';

// Verify-email flow: the reader types the 6-digit code from their email. The code step only shows when a code is known
// to be on its way: sign-up or sign-in sent one (and saved the address in sessionStorage), or the reader sent one here.
// Otherwise the page asks for the address first (filled in from the session when signed in) and sends a code. Until
// the browser has read storage and the session, it shows a skeleton, so neither step flashes before the other.
// Signed-in readers can leave it for later. Until the API's email-code plugin exists, its requests fail with a general error.
// The email step has its own heading ("Where should the code go?"); the code step's description says where the code
// went and how long it lasts. Arriving at the code step from the email step puts focus in the code field, and a
// resent code's notice takes focus.

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { FormNotice } from '@/components/ui/form-notice';
import { FormSkeleton } from '@/components/ui/form-skeleton';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { forgetPendingEmail, readPendingEmail, rememberPendingEmail, rememberSignInEmail } from '../email-storage';
import { authErrorMessage } from '../error-messages';
import { codeStepHeading, VERIFY_EMAIL_HEADINGS } from '../headings';
import { codeSchema, emailSchema } from '../schemas';
import { useAuthHeading } from './auth-heading';

type EmailValues = z.infer<typeof emailSchema>;

type CodeValues = z.input<typeof codeSchema>;

type EmailStepProps = {
    defaultEmail: string;
    onSent: (email: string) => void;
};

type CodeStepProps = {
    email: string;
    signedIn: boolean;
    focusCode: boolean;
    onChangeEmail: () => void;
};

const RESEND_COOLDOWN_SECONDS = 60;

const CODE_FIELD_CODES = ['INVALID_OTP', 'OTP_EXPIRED', 'TOO_MANY_ATTEMPTS'];

// Renders a skeleton until storage and the session are read, then the code step when a code was sent, else the email
// step; offers "Do this later" when signed in.
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

    if (!mounted || isPending) {
        return <FormSkeleton fields={1} />;
    }

    const codeSentTo = changingEmail ? null : (sentTo ?? storedEmail);
    const signedIn = Boolean(session);

    return (
        <div className="flex flex-col gap-8">
            {codeSentTo ? (
                <CodeStep email={codeSentTo} signedIn={signedIn} focusCode={sentTo !== null} onChangeEmail={() => setChangingEmail(true)} />
            ) : (
                <EmailStep
                    defaultEmail={session?.user.email ?? ''}
                    onSent={(address) => {
                        rememberPendingEmail(address);
                        setSentTo(address);
                        setChangingEmail(false);
                    }}
                />
            )}
            {signedIn && (
                <p className="text-ui text-ink-2">
                    Not now?{' '}
                    <TextLink href="/user" className="text-ink">
                        Do this later
                    </TextLink>
                </p>
            )}
        </div>
    );
}

// Asks for the address (starting from `defaultEmail`) and sends a code to it, then hands the address back through `onSent`.
function EmailStep({ defaultEmail, onSent }: EmailStepProps) {
    useAuthHeading(VERIFY_EMAIL_HEADINGS.emailStep);
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: defaultEmail }, reValidateMode: 'onChange' });

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

// Takes the code for `email`, verifies it, and offers a new code (at most once a minute, counting from the code just
// sent) or a different address. `focusCode` puts focus in the code field on arrival from the email step.
function CodeStep({ email, signedIn, focusCode, onChangeEmail }: CodeStepProps) {
    const router = useRouter();
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
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
        clearErrors('root');
        const { failure } = await authRequest((fetchOptions) => authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }, fetchOptions));
        if (failure) {
            setError('root', { message: authErrorMessage(failure) });
            return;
        }
        setResentCount((count) => count + 1);
        setCooldown(RESEND_COOLDOWN_SECONDS);
    }

    return (
        <form noValidate onSubmit={handleSubmit(verify)} className="flex flex-col gap-6">
            {errors.root?.message ? (
                <FormAlert lead="Couldn't confirm your email." message={errors.root.message} />
            ) : (
                resentCount > 0 && (
                    <FormNotice key={resentCount} icon="newsletter" lead="New code sent." takesFocus>
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
// reads it safely (null on the server, the stored address once the page runs in the browser), and the same trick
// tells the component whether it is running in the browser yet.
function subscribeToNothing(): () => void {
    return () => {};
}
