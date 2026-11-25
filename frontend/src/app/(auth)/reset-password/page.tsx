// The heading and form read the URL behind their own <Suspense>, so the frame stays in the static shell. No Referer
// header is sent, so the token can't leak to other sites.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { buttonClassName } from '@/components/ui/button';
import { DocumentTitle } from '@/components/document-title';
import { AuthHeading, AuthPanelText } from '@/features/auth/components/auth-heading';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { RESET_PASSWORD_HEADINGS } from '@/features/auth/headings';
import { FormSkeleton } from '@/components/ui/form-skeleton';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';

type ResetPageProps = Pick<PageProps<'/reset-password'>, 'searchParams'>;

export const metadata: Metadata = { title: 'Choose a new password', referrer: 'no-referrer', robots: { index: false } };

export default function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
    return (
        <AuthFrame
            panel={AUTH_PANELS.resetPassword}
            panelText={
                <Suspense fallback={<AuthPanelText {...AUTH_PANELS.resetPassword} />}>
                    <ResetPanelText searchParams={searchParams} />
                </Suspense>
            }
            heading={
                <Suspense fallback={<AuthHeading {...RESET_PASSWORD_HEADINGS.choose} />}>
                    <ResetHeading searchParams={searchParams} />
                </Suspense>
            }
            aside={{ prompt: 'Remembered it?', label: 'Sign in', href: '/sign-in' }}
        >
            <Suspense fallback={<FormSkeleton fields={1} />}>
                <ResetFromUrl searchParams={searchParams} />
            </Suspense>
        </AuthFrame>
    );
}

// null when the link expired, was used or carries no token.
async function readToken(searchParams: ResetPageProps['searchParams']): Promise<string | null> {
    const { token, error } = await searchParams;

    return typeof token === 'string' && token && !error ? token : null;
}

async function ResetHeading({ searchParams }: ResetPageProps) {
    const token = await readToken(searchParams);

    return <AuthHeading {...(token ? RESET_PASSWORD_HEADINGS.choose : RESET_PASSWORD_HEADINGS.expired)} />;
}

async function ResetPanelText({ searchParams }: ResetPageProps) {
    const token = await readToken(searchParams);

    return <AuthPanelText {...(token ? AUTH_PANELS.resetPassword : RESET_PASSWORD_HEADINGS.expired.panel)} />;
}

// The heading and panel already say what went wrong, so no error box repeats it a third time.
async function ResetFromUrl({ searchParams }: ResetPageProps) {
    const token = await readToken(searchParams);

    if (token)
        return <ResetPasswordForm token={token} />;

    return (
        <div className="flex flex-col gap-4">
            <DocumentTitle title={RESET_PASSWORD_HEADINGS.expired.title} />
            <Link href="/forgot-password" className={buttonClassName('primary', 'w-full justify-center')}>
                Send a new link
            </Link>
            <p className="text-ui text-ink-2">New links work once and last 60 minutes.</p>
        </div>
    );
}
