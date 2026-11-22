// Create-account page.

import type { Metadata } from 'next';
import { SignUpForm } from '@/features/auth/components/sign-up-form';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';

export const metadata: Metadata = { title: 'Create account' };

export default function SignUpPage() {
    return (
        <AuthFrame
            panel={AUTH_PANELS.signUp}
            title="Create account"
            description="It takes a minute. Your feeds, categories and saved posts follow you to every device."
            aside={{ prompt: 'Already have an account?', label: 'Sign in', href: '/sign-in' }}
        >
            <SignUpForm />
        </AuthFrame>
    );
}
