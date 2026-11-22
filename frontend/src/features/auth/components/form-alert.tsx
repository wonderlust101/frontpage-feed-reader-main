'use client';

// The form-level error: an error at the top of the form that takes keyboard focus when it appears or changes,
// so screen reader and keyboard users hear it straight away instead of hunting for it.
// It speaks the fields' language rather than the page Notice's: a rounded box with the same 2px error edge as an
// invalid field, its text inset to line up with the text inside the fields. The lead says what failed in the error
// color; the sentence after it is ink, so the form's main error never reads weaker than the field errors under it.

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

type FormAlertProps = {
    lead: string;
    message: string;
    action?: ReactNode;
};

// Renders the error box (`lead` says what failed, `message` why and what to do) and moves focus to it whenever
// `message` changes. `action` (a button, e.g. "Send a code") sits under the sentence, on the same inset.
export function FormAlert({ lead, message, action }: FormAlertProps) {
    const alertRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        alertRef.current?.focus();
    }, [message]);

    return (
        <div ref={alertRef} tabIndex={-1} role="status" className="rounded-control border-2 border-error bg-control-fill py-4 pr-5 pl-[1.125rem]">
            <p className="flex items-start gap-3 text-ui text-ink">
                <Icon name="error" size="action" className="mt-0.5 text-error" />
                <span>
                    <strong className="block font-semibold text-error">{lead}</strong>
                    {message}
                </span>
            </p>
            {action && <div className="mt-4 pl-8">{action}</div>}
        </div>
    );
}
