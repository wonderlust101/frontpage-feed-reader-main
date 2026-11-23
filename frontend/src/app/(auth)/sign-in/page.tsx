// Sign-in page. It reads ?next= and ?reset= on the server, so the heading and the form each stream in
// behind their own <Suspense> while the frame (and its sticker panel) stays in the static shell (Cache Components).
// Arriving from a password reset changes the heading itself, so the first thing a reader (or
// screen reader) meets says what just happened. The form then fills in the email from that step and returns to the
// usual heading if an attempt fails.

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

// Shows the heading for how the reader arrived (a reset, a confirmed email, or neither).
async function SignInHeading({ searchParams }: SignInPageProps) {
    const arrival = signInArrival(await searchParams);
    return <AuthHeading {...SIGN_IN_HEADINGS[arrival ?? 'default']} />;
}

// Reads where to go next and how the reader arrived, then renders the form.
async function SignInFormFromUrl({ searchParams }: SignInPageProps) {
    const params = await searchParams;
    const next = safeNextPath(typeof params.next === 'string' ? params.next : null);
    return <SignInForm next={next} arrival={signInArrival(params)} />;
}
