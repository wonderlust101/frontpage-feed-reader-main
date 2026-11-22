// Reset-password page, opened from the emailed link. The API's link checks the token first and arrives here with
// ?token=… when it is valid, or ?error=INVALID_TOKEN when it expired or was used. The frame streams in behind
// <Suspense> once the URL is read, so an expired link gets its own heading rather than "Choose a new password" over
// no field. The page sends no Referer header, so the token can't leak to other sites, and stays out of search engines.

import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import type { Heading } from '@/features/auth/components/auth-heading';
import { FormNotice } from '@/features/auth/components/form-notice';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';
import { FormSkeleton } from '../_components/form-skeleton';

export const metadata: Metadata = { title: 'Choose a new password', referrer: 'no-referrer', robots: { index: false } };

const HEADINGS = {
    choose: { title: 'Choose a new password', description: "Make it one you'll remember. It works on every device from now on." },
    expired: { title: 'This link has expired', description: 'Reset links work once and last 60 minutes. Grab a fresh one, it only takes a moment.' },
} satisfies Record<string, Heading>;

export default function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
    return (
        <Suspense
            fallback={
                <ResetFrame heading={HEADINGS.choose}>
                    <FormSkeleton fields={1} />
                </ResetFrame>
            }
        >
            <ResetFromUrl searchParams={searchParams} />
        </Suspense>
    );
}

// Shows the form when the URL carries a token, else the expired-link message with a way to get a new link.
async function ResetFromUrl({ searchParams }: Pick<PageProps<'/reset-password'>, 'searchParams'>) {
    const { token, error } = await searchParams;

    if (typeof token === 'string' && token && !error) {
        return (
            <ResetFrame heading={HEADINGS.choose}>
                <ResetPasswordForm token={token} />
            </ResetFrame>
        );
    }

    return (
        <ResetFrame heading={HEADINGS.expired}>
            <div className="flex flex-col gap-6">
                <FormNotice tone="error" icon="error" lead="This one's used up.">
                    Ask for a new link below, then open it from the newest email. Older links stop working.
                </FormNotice>
                <Link
                    href="/forgot-password"
                    className="inline-flex h-11 w-full items-center justify-center rounded-control bg-ink px-5 text-ui font-semibold text-ground transition-colors duration-200 hover:bg-ink-2"
                >
                    Send a new link
                </Link>
            </div>
        </ResetFrame>
    );
}

// The reset frame with a given heading.
function ResetFrame({ heading, children }: { heading: Heading; children: ReactNode }) {
    return (
        <AuthFrame
            panel={AUTH_PANELS.resetPassword}
            title={heading.title}
            description={heading.description}
            aside={{ prompt: 'Remembered it?', label: 'Sign in', href: '/sign-in' }}
        >
            {children}
        </AuthFrame>
    );
}
