// The auth forms' one primary action: a full-width ink button that shows a spinner and a "…ing" label while it runs.
// While it runs it is disabled (no double submits) and busy, so the label keeps full contrast.

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

type SubmitButtonProps = {
    pending: boolean;
    pendingLabel: string;
    children: ReactNode;
};

// Renders a submit button, disabled with `pendingLabel` and a spinner while `pending`.
export function SubmitButton({ pending, pendingLabel, children }: SubmitButtonProps) {
    return (
        <Button type="submit" disabled={pending} aria-busy={pending || undefined} className="w-full justify-center">
            {pending && <Icon name="loading" className="animate-spin" />}
            {pending ? pendingLabel : children}
        </Button>
    );
}
