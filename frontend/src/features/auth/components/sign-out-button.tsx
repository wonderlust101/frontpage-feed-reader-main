'use client';

// Signs the reader out (Better Auth clears the session cookie) and returns them to the home page. If the request
// fails, the reader is still signed in, so the button comes back with the reason under it instead of leaving.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { authClient } from '../auth-client';
import { authRequest } from '../auth-request';
import { authErrorMessage } from '../error-messages';

// Renders a secondary "Sign out" button that shows "Signing out…" while the request runs, and the error if it fails.
export function SignOutButton() {
    const router = useRouter();
    const [signingOut, setSigningOut] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function signOut() {
        setSigningOut(true);
        setError(null);
        const { failure } = await authRequest((fetchOptions) => authClient.signOut({ fetchOptions }));

        if (failure) {
            setSigningOut(false);
            setError(authErrorMessage(failure));

            return;
        }

        router.replace('/');
        router.refresh();
    }

    return (
        <div className="flex flex-col items-start gap-2">
            <Button variant="secondary" onClick={signOut} disabled={signingOut} aria-busy={signingOut || undefined}>
                <Icon name={signingOut ? 'loading' : 'sign-out'} className={signingOut ? 'animate-spin' : ''} />
                {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
            {error && (
                <p role="alert" className="flex items-start gap-1.5 text-meta font-semibold text-error">
                    <Icon name="error" size="inline" className="mt-0.5" />
                    {error}
                </p>
            )}
        </div>
    );
}
