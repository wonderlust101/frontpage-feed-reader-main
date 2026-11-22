// Sign-in page. It reads ?next=, ?reset= and ?verified= on the server, so the form streams in behind <Suspense> (Cache
// Components keeps the rest of the page in the static shell).

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignInForm, type SignInNotice } from '@/features/auth/components/sign-in-form';
import { safeNextPath } from '@/features/auth/redirect-target';
import { AuthFrame } from '../_components/auth-frame';
import { AUTH_PANELS } from '../_data/panels';
import { FormSkeleton } from '../_components/form-skeleton';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
    return (
        <AuthFrame
            panel={AUTH_PANELS.signIn}
            title="Sign in"
            description="Good to see you again. Your front page is right where you left it."
            aside={{ prompt: 'New to Frontpage?', label: 'Create an account', href: '/sign-up' }}
        >
            <Suspense fallback={<FormSkeleton fields={2} />}>
                <SignInFormFromUrl searchParams={searchParams} />
            </Suspense>
        </AuthFrame>
    );
}

// Reads where to go next and which notice to show from the URL, then renders the form.
async function SignInFormFromUrl({ searchParams }: Pick<PageProps<'/sign-in'>, 'searchParams'>) {
    const params = await searchParams;
    const next = safeNextPath(typeof params.next === 'string' ? params.next : null);
    const notice: SignInNotice = params.reset ? 'reset' : params.verified ? 'verified' : null;

    return <SignInForm next={next} notice={notice} />;
}
