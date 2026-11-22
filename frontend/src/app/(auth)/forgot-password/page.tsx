// Forgot-password page: asks for an email and sends a reset link.

import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { AuthFrame } from '../_components/auth-frame';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
    return (
        <AuthFrame
            title="Forgot your password?"
            intro="Enter your email and we'll send you a link to choose a new one."
            aside={{ prompt: 'Remembered it?', label: 'Sign in', href: '/sign-in' }}
        >
            <ForgotPasswordForm />
        </AuthFrame>
    );
}
