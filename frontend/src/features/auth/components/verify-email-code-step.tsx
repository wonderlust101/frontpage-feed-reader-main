'use client';

// While a code is being resent the button stays (busy), so focus doesn't drop.

import { CODE_LENGTH } from '@frontpage/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod/mini';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { FormNotice } from '@/components/ui/form-notice';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextField } from '@/components/ui/text-field';
import { authClient, sendVerificationCode } from '../auth-client';
import { authRequest } from '../auth-request';
import { forgetPendingEmail, rememberPendingEmail } from '../email-storage';
import { authErrorMessage } from '../error-messages';
import { codeStepHeading } from '../headings';
import { useAuthDescriptionId, useAuthHeading } from '../hooks/use-auth-step';
import { ACCOUNT_HOME } from '../redirect-target';
import { codeSchema } from '../schemas';

type CodeValues = z.input<typeof codeSchema>;

type CheckedCode = z.output<typeof codeSchema>;

type CodeInputEvent = { target: { value: string }; nativeEvent?: { inputType?: string } };

type VerifyEmailCodeStepProps = {
    email: string;
    accountReady: boolean;
    onChangeEmail: () => void;
};

type CodeStepNoticeProps = {
    error: string | undefined;
    resentCount: number;
    accountReady: boolean;
};

type ResendCodeProps = {
    cooldown: number;
    resending: boolean;
    onResend: () => void;
};

// The "new code sent" notice says "in a minute"; change the two together.
const RESEND_COOLDOWN_SECONDS = 60;

const CODE_FIELD_CODES = ['INVALID_OTP', 'OTP_EXPIRED', 'TOO_MANY_ATTEMPTS'];

export function VerifyEmailCodeStep({ email, accountReady, onChangeEmail }: VerifyEmailCodeStepProps) {
    const router = useRouter();
    const descriptionId = useAuthDescriptionId();
    const heading = useMemo(() => codeStepHeading(email), [email]);
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
    const [resending, setResending] = useState(false);
    const [resentCount, setResentCount] = useState(0);

    const {
        register,
        handleSubmit,
        setError,
        clearErrors,
        setFocus,
        formState: { errors, isSubmitting },
    } = useForm<CodeValues, unknown, CheckedCode>({
        resolver: zodResolver(codeSchema),
        defaultValues: { code: '' },
        reValidateMode: 'onChange',
    });

    useAuthHeading(heading);

    useEffect(() => {
        setFocus('code');
    }, [setFocus]);

    useEffect(() => {
        if (cooldown === 0)
            return;

        const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);

        return () => clearTimeout(timer);
    }, [cooldown]);

    async function verify({ code }: CheckedCode) {
        const { failure } = await authRequest((fetchOptions) => authClient.emailOtp.verifyEmail({ email, otp: code }, fetchOptions));

        if (failure) {
            const isCodeError = failure.code !== undefined && CODE_FIELD_CODES.includes(failure.code);

            setError(isCodeError ? 'code' : 'root', { message: authErrorMessage(failure) }, { shouldFocus: true });

            return;
        }

        forgetPendingEmail();
        router.replace(ACCOUNT_HOME);
        router.refresh();
    }

    async function resend() {
        clearErrors('root');
        setResending(true);

        const { failure } = await sendVerificationCode(email);

        setResending(false);

        if (failure) {
            setError('root', { message: authErrorMessage(failure) });

            return;
        }

        rememberPendingEmail(email);
        setResentCount((count) => count + 1);
        setCooldown(RESEND_COOLDOWN_SECONDS);
    }

    function handleCodeInput(event: CodeInputEvent) {
        if (isWholeCodeInserted(event) && !isSubmitting)
            void handleSubmit(verify)();
    }

    return (
        <form noValidate method="post" onSubmit={handleSubmit(verify)} className="flex flex-col gap-6">
            <CodeStepNotice error={errors.root?.message} resentCount={resentCount} accountReady={accountReady} />

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
                {...register('code', { onChange: handleCodeInput })}
                describedBy={descriptionId}
            />

            <SubmitButton pending={isSubmitting} pendingLabel="Checking…">
                Confirm email
            </SubmitButton>

            <div className="flex flex-col gap-1">
                <p className="text-ui text-ink-2">Didn&apos;t get it? Check your spam folder.</p>
                <div className="flex flex-wrap items-center gap-x-6">
                    <ResendCode cooldown={cooldown} resending={resending} onResend={resend} />
                    <Button variant="quiet" onClick={onChangeEmail}>
                        Use a different email
                    </Button>
                </div>
            </div>
        </form>
    );
}

// A paste or autofill drops the whole code in at once (it isn't typed text), so it can be confirmed straight away.
function isWholeCodeInserted(event: CodeInputEvent): boolean {
    const inputType = event.nativeEvent?.inputType;
    const isTyped = inputType?.startsWith('insertText') || inputType?.startsWith('delete');
    const digits = event.target.value.replace(/\s/g, '');

    return !isTyped && digits.length === CODE_LENGTH && /^\d+$/.test(digits);
}

// One message at a time: an error first, then a resent code, then the welcome straight after sign-up.
function CodeStepNotice({ error, resentCount, accountReady }: CodeStepNoticeProps) {
    if (error)
        return <FormAlert lead="Couldn't confirm your email." message={error} />;

    if (resentCount > 0) {
        return (
            <FormNotice key={resentCount} icon="newsletter" lead="New code sent." takesFocus>
                Use the code in the newest email; older ones stop working. You can send another in a minute.
            </FormNotice>
        );
    }

    if (accountReady) {
        return (
            <FormNotice icon="healthy" lead="Account created.">
                One last step: enter the code we emailed you.
            </FormNotice>
        );
    }

    return null;
}

// The wait is plain text at full contrast; a faded, disabled button would hide it.
function ResendCode({ cooldown, resending, onResend }: ResendCodeProps) {
    if (resending) {
        return (
            <Button variant="quiet" aria-disabled aria-busy>
                Sending a new code…
            </Button>
        );
    }

    if (cooldown > 0)
        return <span className="inline-flex h-11 items-center text-ui text-ink-2 tabular-nums">Send a new code in {cooldown}s</span>;

    return (
        <Button variant="quiet" onClick={onResend}>
            Send a new code
        </Button>
    );
}
