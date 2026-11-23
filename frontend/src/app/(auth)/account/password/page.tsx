// Change-password page for signed-in readers. proxy.ts already sent visitors without a session cookie to sign-in;
// requireUser checks the session is still valid, inside <Suspense> because it reads the request; if the API can't
// answer, error.tsx here shows instead. It sits in the (auth) group because it uses the auth frame; /user doesn't,
// so it lives outside the group.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';
import { requireUser } from '@/features/auth/require-user';
import { AuthHeading } from '@/features/auth/components/auth-heading';
import { CHANGE_PASSWORD_HEADINGS } from '@/features/auth/headings';
import { FormSkeleton } from '@/components/ui/form-skeleton';
import { AuthFrame } from '../../_components/auth-frame';
import { AUTH_PANELS } from '../../_data/panels';

export const metadata: Metadata = { title: 'Change your password', robots: { index: false } };

export default function ChangePasswordPage() {
    return (
        <AuthFrame
            panel={AUTH_PANELS.changePassword}
            heading={<AuthHeading {...CHANGE_PASSWORD_HEADINGS.default} />}
            aside={{ label: 'Back to your account', href: '/user' }}
        >
            <Suspense fallback={<FormSkeleton fields={2} />}>
                <SignedInChangePasswordForm />
            </Suspense>
        </AuthFrame>
    );
}

// Renders the form only for a valid session; otherwise requireUser redirects to sign-in.
async function SignedInChangePasswordForm() {
    await requireUser('/account/password');
    return <ChangePasswordForm />;
}
