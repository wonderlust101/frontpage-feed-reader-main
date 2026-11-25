'use client';

// A button with a native popover panel: Escape, outside clicks and focus return come from the browser. Not role="menu":
// the panel holds ordinary links, buttons and radios, so it is a non-modal dialog named by `label`.

import { useId, type ReactNode } from 'react';

type ShellMenuProps = {
    label: string;
    trigger: ReactNode;
    triggerClassName: string;
    placement: 'below' | 'beside' | 'row';
    children: ReactNode;
};

// `placement`: "below" a toolbar button, "beside" the rail's foot, or "row" to the right of a panel row (else under it).
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
