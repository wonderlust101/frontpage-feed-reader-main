import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { AuthHeading } from '@/features/auth/components/auth-heading';
import { FORGOT_PASSWORD_HEADINGS } from '@/features/auth/headings';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
    return (
        <AuthFrame
            panel={AUTH_PANELS.forgotPassword}
            heading={<AuthHeading {...FORGOT_PASSWORD_HEADINGS.default} />}
            aside={{ prompt: 'Remembered it?', label: 'Sign in', href: '/sign-in' }}
        >
            <ForgotPasswordForm />
        </AuthFrame>
    );
}
