// A short confirmation for an action that can be taken back. Never an error the reader must act on: those stay inline.

import type { ReactNode } from 'react';
import { Icon } from './icon';

type ToastProps = {
    children: ReactNode;
    onUndo?: () => void;
    onDismiss: () => void;
};

// Place it in a fixed region with role="status" so screen readers hear each new message.
export function Toast({ children, onUndo, onDismiss }: ToastProps) {
    return (
        <div className="flex min-h-12 w-full max-w-md items-center gap-2 rounded-control border-[1.5px] border-transparent bg-ink py-1.5 pr-1.5 pl-5 text-ui text-ground">
            <p className="flex-1 font-medium">{children}</p>
            {onUndo && (
                <button
                    type="button"
                    onClick={onUndo}
                    className="flex h-9 items-center gap-2 rounded-toggle px-3 font-semibold underline decoration-1 underline-offset-4 hover:decoration-2"
                >
                    <Icon name="undo" size="inline" />
                    Undo
                </button>
            )}
            <button type="button" onClick={onDismiss} className="grid size-9 place-items-center rounded-toggle hover:bg-ground/15">
                <Icon name="close" size="action" label="Dismiss" />
            </button>
        </div>
    );
}
