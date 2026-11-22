'use client';

// The form-level error: an error Notice at the top of the form that takes keyboard focus when it appears or changes,
// so screen reader and keyboard users hear it straight away instead of hunting for it.

import { useEffect, useRef, type ReactNode } from 'react';
import { Notice } from '@/components/ui/notice';

type FormAlertProps = {
    lead: string;
    message: string;
    action?: ReactNode;
};

// Renders the error notice (`lead` says what failed, `message` why and what to do) and moves focus to it whenever `message` changes.
export function FormAlert({ lead, message, action }: FormAlertProps) {
    const alertRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        alertRef.current?.focus();
    }, [message]);

    return (
        <div ref={alertRef} tabIndex={-1}>
            <Notice tone="error" icon="error" lead={lead} action={action}>
                {message}
            </Notice>
        </div>
    );
}
