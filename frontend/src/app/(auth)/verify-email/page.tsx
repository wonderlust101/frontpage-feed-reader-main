// Verify-email page: confirm the address with the 6-digit code the API emails after sign-up.

import type { Metadata } from 'next';
import { VerifyEmailForm } from '@/features/auth/components/verify-email-form';
import { AuthHeading } from '@/features/auth/components/auth-heading';
import { VERIFY_EMAIL_HEADINGS } from '@/features/auth/headings';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';

export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false } };

export default function VerifyEmailPage() {
    return (
        <AuthFrame
            panel={AUTH_PANELS.verifyEmail}
            heading={<AuthHeading {...VERIFY_EMAIL_HEADINGS.default} />}
            aside={{ prompt: 'Already confirmed?', label: 'Sign in', href: '/sign-in' }}
        >
            <VerifyEmailForm />
        </AuthFrame>
    );
}
