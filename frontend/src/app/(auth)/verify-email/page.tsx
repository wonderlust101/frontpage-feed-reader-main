// Verify-email page: confirm the address with the 6-digit code the API emails after sign-up.

import type { Metadata } from 'next';
import { VerifyEmailForm } from '@/features/auth/components/verify-email-form';
import { AuthFrame } from '../_components/auth-frame';

export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false } };

export default function VerifyEmailPage() {
    return (
        <AuthFrame
            title="Check your inbox."
            intro="Confirm your email address with the code we sent you, so you can always get back into your account."
            aside={{ prompt: 'Already confirmed?', label: 'Sign in', href: '/sign-in' }}
        >
            <VerifyEmailForm />
        </AuthFrame>
    );
}
