// The heading and form read ?next= and ?reset= behind their own <Suspense>, so the frame stays in the static shell.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthHeading } from '@/features/auth/components/auth-heading';
import { SignInForm } from '@/features/auth/components/sign-in-form';
import { SIGN_IN_HEADINGS, signInArrival } from '@/features/auth/headings';
import { safeNextPath } from '@/features/auth/redirect-target';
import { FormSkeleton } from '@/components/ui/form-skeleton';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';

export const metadata: Metadata = { title: 'Sign in' };

type SignInPageProps = Pick<PageProps<'/sign-in'>, 'searchParams'>;

export default function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
    return (
        <AuthFrame
            panel={AUTH_PANELS.signIn}
            heading={
                <Suspense fallback={<AuthHeading {...SIGN_IN_HEADINGS.default} />}>
                    <SignInHeading searchParams={searchParams} />
                </Suspense>
            }
            aside={{ prompt: 'New to Frontpage?', label: 'Create an account', href: '/sign-up' }}
        >
            <Suspense fallback={<FormSkeleton fields={2} />}>
                <SignInFormFromUrl searchParams={searchParams} />
            </Suspense>
        </AuthFrame>
    );
}

async function SignInHeading({ searchParams }: SignInPageProps) {
    const arrival = signInArrival(await searchParams);

    return <AuthHeading {...SIGN_IN_HEADINGS[arrival ?? 'default']} />;
}

async function SignInFormFromUrl({ searchParams }: SignInPageProps) {
    const params = await searchParams;
    const next = safeNextPath(typeof params.next === 'string' ? params.next : null);

    return <SignInForm next={next} arrival={signInArrival(params)} />;
}
