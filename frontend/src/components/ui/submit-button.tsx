// Disabled while pending (no double submits) and busy, so the "…ing" label keeps full contrast.

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

type SubmitButtonProps = {
    pending: boolean;
    pendingLabel: string;
    children: ReactNode;
};

export function SubmitButton({ pending, pendingLabel, children }: SubmitButtonProps) {
    return (
        <Button type="submit" disabled={pending} aria-busy={pending || undefined} className="w-full justify-center">
            {pending && <Icon name="loading" className="animate-spin" />}
            {pending ? pendingLabel : children}
        </Button>
    );
}
