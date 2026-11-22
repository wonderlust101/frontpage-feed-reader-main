'use client';

// Signs the reader out (Better Auth clears the session cookie) and returns them to the home page.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { authClient } from '../auth-client';

// Renders a secondary "Sign out" button that shows "Signing out…" while the request runs.
export function SignOutButton() {
    const router = useRouter();
    const [signingOut, setSigningOut] = useState(false);

    async function signOut() {
        setSigningOut(true);
        await authClient.signOut();
        router.replace('/');
        router.refresh();
    }

    return (
        <Button variant="secondary" onClick={signOut} disabled={signingOut}>
            <Icon name={signingOut ? 'loading' : 'sign-out'} className={signingOut ? 'animate-spin' : ''} />
            {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
    );
}
