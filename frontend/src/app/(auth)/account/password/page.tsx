// Change-password page for signed-in readers. proxy.ts already sent visitors without a session cookie to sign-in;
// requireUser checks the session is still valid, inside <Suspense> because it reads the request.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';
import { requireUser } from '@/features/auth/require-user';
import { AuthFrame } from '../../_components/auth-frame';
import { AUTH_PANELS } from '../../_data/panels';
import { FormSkeleton } from '../../_components/form-skeleton';

export const metadata: Metadata = { title: 'Change your password', robots: { index: false } };

export default function ChangePasswordPage() {
    return (
        <AuthFrame
            panel={AUTH_PANELS.changePassword}
            title="Change your password"
            description="Pick one you don't use anywhere else. Your feeds stay exactly as they are."
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
