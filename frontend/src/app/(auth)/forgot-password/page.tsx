// Forgot-password page: asks for an email and sends a reset link.

import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
    return (
        <AuthFrame
            panel={AUTH_PANELS.forgotPassword}
            title="Forgot your password?"
            description="No problem. Tell us your email and we'll send you a reset link."
            aside={{ prompt: 'Remembered it?', label: 'Sign in', href: '/sign-in' }}
        >
            <ForgotPasswordForm />
        </AuthFrame>
    );
}
