// Create-account page.

import type { Metadata } from 'next';
import { SignUpForm } from '@/features/auth/components/sign-up-form';
import { AuthFrame } from '../_components/auth-frame';

export const metadata: Metadata = { title: 'Create account' };

export default function SignUpPage() {
    return (
        <AuthFrame
            title="Make it yours."
            intro="Create an account to keep your feeds, categories and saved items on every device."
            aside={{ prompt: 'Have an account?', label: 'Sign in', href: '/sign-in' }}
        >
            <SignUpForm />
        </AuthFrame>
    );
}
