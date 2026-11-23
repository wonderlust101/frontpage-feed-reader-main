// A header menu: a shell-control button that opens a native popover panel under it. Escape, a click outside and focus
// return come from the browser, with no script. Not role="menu": the panel holds ordinary links, buttons and radios.

import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

type ShellMenuProps = {
    id: string;
    label: string;
    icon: IconName;
    children: ReactNode;
};

// Renders the button (named `label`, showing `icon`) and the panel; `id` must be unique on the page.
export function ShellMenu({ id, label, icon, children }: ShellMenuProps) {
    return (
        <>
            <button type="button" popoverTarget={id} className="shell-control">
                <Icon name={icon} />
                <span className="sr-only">{label}</span>
            </button>
            <div id={id} popover="auto" className="shell-menu">
                {children}
            </div>
        </>
    );
}
