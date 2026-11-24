'use client';

// Shown when the API can't check the session, instead of sending the reader to sign-in as if signed out.

import { TextLink } from '@/components/ui/text-link';
import { AccountUnavailable } from '@/features/auth/components/account-unavailable';
import { ACCOUNT_UNAVAILABLE_HEADING } from '@/features/auth/headings';

export default function AccountError({ retry }: { error: unknown; retry: () => void }) {
    return (
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-gutter py-12">
            <h1 className="type-headline">{ACCOUNT_UNAVAILABLE_HEADING.title}</h1>
            <p className="text-ink-2">{ACCOUNT_UNAVAILABLE_HEADING.description}</p>
            <AccountUnavailable retry={retry} />
            <TextLink href="/" standalone className="self-start text-ui">
                Back to the home page
            </TextLink>
        </div>
    );
}
