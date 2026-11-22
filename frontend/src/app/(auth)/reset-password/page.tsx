// Reset-password page, opened from the emailed link. The API's link checks the token first and arrives here with
// ?token=… when it is valid, or ?error=INVALID_TOKEN when it expired or was used. The page sends no Referer header,
// so the token can't leak to other sites, and stays out of search engines.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Notice } from '@/components/ui/notice';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { AuthFrame } from '../_components/auth-frame';
import { FormSkeleton } from '../_components/form-skeleton';

export const metadata: Metadata = { title: 'Choose a new password', referrer: 'no-referrer', robots: { index: false } };

export default function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
    return (
        <AuthFrame
            title="Choose a new password."
            intro="You'll use it to sign in from now on, on every device."
            aside={{ prompt: 'Remembered it?', label: 'Sign in', href: '/sign-in' }}
        >
            <Suspense fallback={<FormSkeleton fields={1} />}>
                <ResetFromUrl searchParams={searchParams} />
            </Suspense>
        </AuthFrame>
    );
}

// Shows the form when the URL carries a token, else the expired-link message with a way to get a new link.
async function ResetFromUrl({ searchParams }: Pick<PageProps<'/reset-password'>, 'searchParams'>) {
    const { token, error } = await searchParams;

    if (typeof token === 'string' && token && !error) {
        return <ResetPasswordForm token={token} />;
    }

    return (
        <div className="flex flex-col gap-6">
            <Notice tone="error" icon="error" lead="This link has expired.">
                Reset links work once and expire after 60 minutes. Ask for a new one and use the latest email.
            </Notice>
            <Link
                href="/forgot-password"
                className="inline-flex h-11 w-full items-center justify-center rounded-control bg-ink px-5 text-ui font-semibold text-ground transition-colors duration-200 hover:bg-ink-2"
            >
                Send a new link
            </Link>
        </div>
    );
}
