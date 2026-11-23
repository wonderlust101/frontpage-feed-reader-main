'use client';

// Shown when this signed-in page can't check the session because the API is down, slow or erroring (getSession
// throws), instead of sending the reader to sign-in as if they were signed out. A temporary placeholder for now.

import { AccountUnavailable } from '@/features/auth/components/account-unavailable';

export default function AccountError({ retry }: { error: unknown; retry: () => void }) {
    return <AccountUnavailable retry={retry} />;
}
