'use client';

// The form-level error: an error FormNotice at the top of the form that takes keyboard focus when it appears or changes,
// so screen reader and keyboard users hear it straight away instead of hunting for it.

import { useEffect, useRef, type ReactNode } from 'react';
import { FormNotice } from './form-notice';

type FormAlertProps = {
    lead: string;
    message: string;
    action?: ReactNode;
};

// Renders the error box (`lead` says what failed, `message` why and what to do) and moves focus to it whenever `message` changes.
export function FormAlert({ lead, message, action }: FormAlertProps) {
    const alertRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        alertRef.current?.focus();
    }, [message]);

    return (
        <FormNotice ref={alertRef} tabIndex={-1} tone="error" icon="error" lead={lead} action={action}>
            {message}
        </FormNotice>
    );
}
