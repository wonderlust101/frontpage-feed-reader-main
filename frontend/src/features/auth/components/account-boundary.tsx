'use client';

// The error boundary around the header's account slot. The route's error.tsx doesn't wrap its own layout, so without
// this an API outage while loading the account would escape the shell. It shows a "Try again" control in the menu's
// place; retry() renders the slot again, which asks the API again. redirect() and notFound() pass straight through.

import { catchError, type ErrorInfo } from 'next/error';
import { Icon } from '@/components/ui/icon';

export const AccountBoundary = catchError(AccountRetry);

// Renders the retry control; the visible "Try again" is part of its accessible name, as WCAG 2.5.3 asks.
function AccountRetry(_props: Record<string, unknown>, { retry }: ErrorInfo) {
    return (
        <button type="button" onClick={() => retry()} aria-label="Couldn't load your account. Try again" className="tool-button">
            <Icon name="refresh" />
            <span className="sr-only in-data-[account=row]:not-sr-only">Try again</span>
        </button>
    );
}
