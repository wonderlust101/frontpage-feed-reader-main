'use client';

// What a signed-in page offers when the API can't say who is signed in (it is down, slow or erroring), under the
// ACCOUNT_UNAVAILABLE_HEADING its error.tsx shows: try again (the page around it offers the way home). It never shows
// the error's details. The full error-page design is planned on the `feat/error-pages` branch (docs/notes/error-pages.md there).

import { SubmitButton } from '@/components/ui/submit-button';

type AccountUnavailableProps = {
    retrying?: boolean;
    retry: () => void;
};

// Renders a full-width "Try again" button that re-renders the page (`retry` from error.tsx), busy while `retrying`.
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
