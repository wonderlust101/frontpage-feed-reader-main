// Sign-in page. It reads ?next=, ?reset= and ?verified= on the server, so the frame streams in behind <Suspense>
// (Cache Components keeps the default frame in the static shell). Arriving from a password reset or a confirmed
// email changes the heading itself, so the first thing a reader (or screen reader) meets says what just happened.
// The form then fills in the email from that step and returns to the usual heading if an attempt fails.

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import type { Heading } from '@/features/auth/components/auth-heading';
import { SignInForm } from '@/features/auth/components/sign-in-form';
import { SIGN_IN_HEADINGS, type SignInArrival } from '@/features/auth/sign-in-headings';
import { safeNextPath } from '@/features/auth/redirect-target';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';
import { FormSkeleton } from '../_components/form-skeleton';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
    return (
        <Suspense
            fallback={
                <SignInFrame heading={SIGN_IN_HEADINGS.default}>
                    <FormSkeleton fields={2} />
                </SignInFrame>
            }
        >
            <SignInFromUrl searchParams={searchParams} />
        </Suspense>
    );
}

// Reads where to go next and which heading to show from the URL, then renders the frame and form.
async function SignInFromUrl({ searchParams }: Pick<PageProps<'/sign-in'>, 'searchParams'>) {
    const params = await searchParams;
    const next = safeNextPath(typeof params.next === 'string' ? params.next : null);
    const arrival: SignInArrival = params.reset ? 'reset' : params.verified ? 'verified' : null;

    return (
        <SignInFrame heading={SIGN_IN_HEADINGS[arrival ?? 'default']}>
            <SignInForm next={next} arrival={arrival} />
        </SignInFrame>
    );
}

// The sign-in frame with a given heading.
function SignInFrame({ heading, children }: { heading: Heading; children: ReactNode }) {
    return (
        <AuthFrame
            panel={AUTH_PANELS.signIn}
            title={heading.title}
            description={heading.description}
            aside={{ prompt: 'New to Frontpage?', label: 'Create an account', href: '/sign-up' }}
        >
            {children}
        </AuthFrame>
    );
}
