'use client';

// A shell menu (Aa, account, guest): a button that opens a native popover panel anchored to it. Escape, a click
// outside and focus return come from the browser, with no script. Not role="menu": the panel holds ordinary links,
// buttons and radios, so it is a non-modal dialog named by `label`. Ids come from useId, so a page can hold two.

import { useId, type ReactNode } from 'react';

type ShellMenuProps = {
    label: string;
    trigger: ReactNode;
    triggerClassName: string;
    placement: 'below' | 'beside';
    children: ReactNode;
};

// Renders the button (showing `trigger`) and the panel; "below" opens under a toolbar button, "beside" to the right of
// the rail's foot (or above it, in the drawer).
export function ShellMenu({ label, trigger, triggerClassName, placement, children }: ShellMenuProps) {
    const id = useId();

    return (
        <>
            <button type="button" popoverTarget={id} className={triggerClassName}>
                {trigger}
            </button>
            <div id={id} popover="auto" role="dialog" aria-label={label} data-placement={placement} className="menu-panel">
                {children}
            </div>
        </>
    );
}
