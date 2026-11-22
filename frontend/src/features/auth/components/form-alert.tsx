// The form-level error: an error FormNotice at the top of the form that takes keyboard focus when it appears or its
// message changes, so screen reader and keyboard users hear it straight away instead of hunting for it.

import type { ReactNode } from 'react';
import { FormNotice } from './form-notice';

type FormAlertProps = {
    lead: string;
    message: string;
    action?: ReactNode;
};

// Renders the error box (`lead` says what failed, `message` why and what to do).
export function FormAlert({ lead, message, action }: FormAlertProps) {
    return (
        <FormNotice tone="error" icon="error" lead={lead} action={action} focusKey={message}>
            {message}
        </FormNotice>
    );
}
