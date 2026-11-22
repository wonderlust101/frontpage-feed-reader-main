// Sign-in page. It reads ?next=, ?reset= and ?verified= on the server, so the frame streams in behind <Suspense>
// (Cache Components keeps the default frame in the static shell). Arriving from a password reset or a confirmed
// email changes the heading itself, so the first thing a reader (or screen reader) meets says what just happened.

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import type { Heading } from '@/features/auth/components/auth-heading';
import { SignInForm } from '@/features/auth/components/sign-in-form';
import { safeNextPath } from '@/features/auth/redirect-target';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';
import { FormSkeleton } from '../_components/form-skeleton';

export const metadata: Metadata = { title: 'Sign in' };

const HEADINGS = {
    default: { title: 'Sign in', description: 'Good to see you again. Your front page is waiting.' },
    reset: { title: 'Password changed', description: "New key, same feeds. Sign in with it and you're back." },
    verified: { title: "You're confirmed", description: 'Welcome aboard! Sign in to open your front page for the first time.' },
} satisfies Record<string, Heading>;

export default function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
    return (
        <Suspense
            fallback={
                <SignInFrame heading={HEADINGS.default}>
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
    const heading = params.reset ? HEADINGS.reset : params.verified ? HEADINGS.verified : HEADINGS.default;

    return (
        <SignInFrame heading={heading}>
            <SignInForm next={next} />
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
