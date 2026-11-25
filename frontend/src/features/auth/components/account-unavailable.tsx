'use client';

// Shown when the API can't say who is signed in; it never shows the error's details. Next's retry() returns nothing to
// wait on, so the button stays busy from the click until a new error arrives or the page loads in its place.

import { useState, type FormEvent } from 'react';
import { SubmitButton } from '@/components/ui/submit-button';

type AccountUnavailableProps = {
    error: unknown;
    retry: () => void;
};

export function AccountUnavailable({ error, retry }: AccountUnavailableProps) {
    const [retriedAfter, setRetriedAfter] = useState<unknown>(null);
    const retrying = retriedAfter !== null && retriedAfter === error;

    function retryOnSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setRetriedAfter(error);
        retry();
    }

    return (
        <form onSubmit={retryOnSubmit}>
            <SubmitButton pending={retrying} pendingLabel="Trying again…">
                Try again
            </SubmitButton>
        </form>
    );
}
