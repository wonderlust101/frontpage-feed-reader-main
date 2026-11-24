import type { Metadata } from 'next';
import { SignUpForm } from '@/features/auth/components/sign-up-form';
import { AuthHeading } from '@/features/auth/components/auth-heading';
import { SIGN_UP_HEADING } from '@/features/auth/headings';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';

export const metadata: Metadata = { title: 'Create account' };

export default function SignUpPage() {
    return (
        <AuthFrame
            panel={AUTH_PANELS.signUp}
            heading={<AuthHeading {...SIGN_UP_HEADING} />}
            aside={{ prompt: 'Already have an account?', label: 'Sign in', href: '/sign-in' }}
        >
            <SignUpForm />
        </AuthFrame>
    );
}
