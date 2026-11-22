// Verify-email page: confirm the address with the 6-digit code the API emails after sign-up.

import type { Metadata } from 'next';
import { VerifyEmailForm } from '@/features/auth/components/verify-email-form';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';

export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false } };

export default function VerifyEmailPage() {
    return (
        <AuthFrame
            panel={AUTH_PANELS.verifyEmail}
            title="Confirm your email"
            description="Just checking it's really you, so you can always get back in."
            aside={{ prompt: 'Already confirmed?', label: 'Sign in', href: '/sign-in' }}
        >
            <VerifyEmailForm />
        </AuthFrame>
    );
}
