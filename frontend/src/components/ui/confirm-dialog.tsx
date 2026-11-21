'use client';

// Confirm dialog for actions that cannot be undone (unsubscribing drops a feed's history). A native modal <dialog>:
// focus moves in and is trapped, Escape cancels, and focus returns to the button that opened it.
// Anything that can be undone uses a toast with Undo instead, never this.

import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './button';

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    children: ReactNode;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
};

// Renders the dialog; `open` drives showModal()/close(), and every way of closing other than confirm calls `onCancel`.
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (open && !dialog?.open) {
            dialog?.showModal();
        } else if (!open && dialog?.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="confirm-dialog-title"
            onCancel={(event) => {
                event.preventDefault();
                onCancel();
            }}
            className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-stage border-[1.5px] border-ink bg-ground p-6 text-ink backdrop:bg-ink/40 md:p-8"
        >
            <h2 id="confirm-dialog-title" className="type-headline">
                {title}
            </h2>
            <div className="mt-3 text-ui text-ink-2">{children}</div>
            <div className="mt-8 flex flex-wrap justify-end gap-3">
                <Button variant="secondary" onClick={onCancel} autoFocus>
                    Cancel
                </Button>
                <Button variant="destructive" onClick={onConfirm}>
                    {confirmLabel}
                </Button>
            </div>
        </dialog>
    );
}
