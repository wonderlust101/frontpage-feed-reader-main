'use client';

// Shown when the API can't say who is signed in; it never shows the error's details.

import { SubmitButton } from '@/components/ui/submit-button';

type AccountUnavailableProps = {
    retrying?: boolean;
    retry: () => void;
};

export function AccountUnavailable({ retrying = false, retry }: AccountUnavailableProps) {
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                retry();
            }}
        >
            <SubmitButton pending={retrying} pendingLabel="Trying again…">
                Try again
            </SubmitButton>
        </form>
    );
}
