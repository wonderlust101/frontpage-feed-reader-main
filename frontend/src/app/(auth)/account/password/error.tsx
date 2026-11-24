'use client';

// Next's retry() returns nothing to wait on, so the button stays busy from the click until a new error arrives or
// the page loads in its place.

import { useState } from 'react';
import { DocumentTitle } from '@/components/document-title';
import { AuthHeading } from '@/features/auth/components/auth-heading';
import { AccountUnavailable } from '@/features/auth/components/account-unavailable';
import { ACCOUNT_UNAVAILABLE_HEADING } from '@/features/auth/headings';
import { AuthFrame } from '../../_components/auth-frame';
import { AUTH_PANELS } from '../../_data/panels';

export default function AccountError({ error, retry }: { error: unknown; retry: () => void }) {
    const [retriedAfter, setRetriedAfter] = useState<unknown>(null);
    const retrying = retriedAfter !== null && retriedAfter === error;

    return (
        <AuthFrame
            panel={AUTH_PANELS.accountUnavailable}
            heading={<AuthHeading {...ACCOUNT_UNAVAILABLE_HEADING} />}
            aside={{ label: 'Back to the home page', href: '/' }}
        >
            <DocumentTitle title={ACCOUNT_UNAVAILABLE_HEADING.title} />
            <AccountUnavailable
                retrying={retrying}
                retry={() => {
                    setRetriedAfter(error);
                    retry();
                }}
            />
        </AuthFrame>
    );
}
