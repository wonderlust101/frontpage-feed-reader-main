// A form-level error that takes focus when it appears. Keyed by its message, so a new message is a fresh notice that
// screen reader and keyboard users hear at once.

import type { ReactNode } from 'react';
import { FormNotice } from './form-notice';

type FormAlertProps = {
    lead: string;
    message: string;
    action?: ReactNode;
};

export function FormAlert({ lead, message, action }: FormAlertProps) {
    return (
        <FormNotice key={message} tone="error" icon="error" lead={lead} action={action} takesFocus>
            {message}
        </FormNotice>
    );
}
