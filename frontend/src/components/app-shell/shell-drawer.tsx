'use client';

// Below lg, the shell's navigation lives in a drawer: a menu button in the toolbar opens a native modal <dialog> from
// the left, so focus stays inside, Escape closes it and focus returns to the button. It also closes on a click on its
// backdrop or on any link inside, including the link to the page already open (so it can't wait for the URL to change).

import { useRef, type MouseEvent, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

// Renders the menu button and the drawer holding `children` (the shell's navigation).
export function ShellDrawer({ children }: { children: ReactNode }) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    // Closes the drawer when the click lands on the backdrop (the dialog itself, which has no padding) or inside a link.
    function closeOnBackdropOrLink(event: MouseEvent<HTMLDialogElement>) {
        const isBackdrop = event.target === event.currentTarget;
        const isLink = event.target instanceof Element && event.target.closest('a') !== null;
        if (isBackdrop || isLink) {
            event.currentTarget.close();
        }
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
