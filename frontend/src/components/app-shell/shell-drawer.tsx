'use client';

// Below lg the navigation lives in a native modal <dialog>, which gives focus trapping, Escape and focus return. It
// also closes on any link click, the current page's included, since it can't wait for the URL to change.

import { useRef, type MouseEvent, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

export function ShellDrawer({ children }: { children: ReactNode }) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    // The dialog has no padding, so a click on the dialog itself is a click on its backdrop.
    function closeOnBackdropOrLink(event: MouseEvent<HTMLDialogElement>) {
        const isBackdrop = event.target === event.currentTarget;
        const isLink = event.target instanceof Element && event.target.closest('a') !== null;

        if (isBackdrop || isLink)
            event.currentTarget.close();
    }

    return (
        <>
            <button type="button" aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()} className="tool-button lg:hidden">
                <Icon name="menu" />
                <span className="sr-only">Open menu</span>
            </button>
            <dialog
                ref={dialogRef}
                aria-label="Menu"
                onClick={closeOnBackdropOrLink}
                className="m-0 h-dvh max-h-none w-[min(20rem,calc(100vw-3rem))] max-w-none bg-panel p-0 text-ink transition-[translate] duration-200 ease-out backdrop:bg-on-field/45 starting:open:-translate-x-full lg:hidden"
            >
                <div className="relative flex h-full flex-col gap-3 overflow-y-auto px-3 pt-3 pb-4">
                    <button type="button" onClick={() => dialogRef.current?.close()} className="tool-button absolute top-3 right-3">
                        <Icon name="close" />
                        <span className="sr-only">Close menu</span>
                    </button>
                    {children}
                </div>
            </dialog>
        </>
    );
}
