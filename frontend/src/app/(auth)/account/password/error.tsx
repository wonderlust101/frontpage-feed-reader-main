'use client';

import { DocumentTitle } from '@/components/document-title';
import { AccountUnavailable } from '@/features/auth/components/account-unavailable';
import { AuthHeading } from '@/features/auth/components/auth-step-frame';
import { ACCOUNT_UNAVAILABLE_HEADING } from '@/features/auth/headings';
import { AuthFrame } from '../../_components/auth-frame';
import { AUTH_PANELS } from '../../_data/panels';

export default function AccountError({ error, retry }: { error: unknown; retry: () => void }) {
    return (
        <AuthFrame
            panel={AUTH_PANELS.accountUnavailable}
            heading={<AuthHeading {...ACCOUNT_UNAVAILABLE_HEADING} />}
            aside={{ label: 'Back to the home page', href: '/' }}
        >
            <DocumentTitle title={ACCOUNT_UNAVAILABLE_HEADING.title} />
            <AccountUnavailable error={error} retry={retry} />
        </AuthFrame>
    );
}
