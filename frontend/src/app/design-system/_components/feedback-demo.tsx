'use client';

// "Mark all read" can be taken back, so it confirms with a toast and Undo; "Unsubscribe" cannot, so it asks first.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Icon } from '@/components/ui/icon';
import { Toast } from '@/components/ui/toast';

export function ToastDemo() {
    const [message, setMessage] = useState<string | null>('Marked 12 items read.');

    return (
        <div className="flex flex-col items-start gap-6">
            <Button variant="secondary" onClick={() => setMessage('Marked 12 items read.')}>
                <Icon name="mark-all-read" size="action" />
                Mark all read
            </Button>
            <div role="status" className="w-full">
                {message && (
                    <Toast onUndo={() => setMessage('12 items are unread again.')} onDismiss={() => setMessage(null)}>
                        {message}
                    </Toast>
                )}
            </div>
        </div>
    );
}

export function ConfirmDemo() {
    const [isOpen, setIsOpen] = useState(false);
    const [outcome, setOutcome] = useState('');

    return (
        <div className="flex flex-col items-start gap-4">
            <Button variant="destructive" onClick={() => setIsOpen(true)}>
                <Icon name="delete" size="action" />
                Unsubscribe
            </Button>
            <p aria-live="polite" className="text-meta text-ink-2">
                {outcome}
            </p>
            <ConfirmDialog
                open={isOpen}
                title="Unsubscribe from Netlify Blog?"
                confirmLabel="Unsubscribe"
                onConfirm={() => {
                    setIsOpen(false);
                    setOutcome('Unsubscribed (demo: nothing was removed).');
                }}
                onCancel={() => {
                    setIsOpen(false);
                    setOutcome('Kept Netlify Blog.');
                }}
            >
                Its 48 saved and unread items go too. You can subscribe again later, but read history won&apos;t come back.
            </ConfirmDialog>
        </div>
    );
}
