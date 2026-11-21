// Empty state: what a list shows when there is nothing in it. An icon, a plain headline that says why, one line on
// what to do, and at most one action. Never a blank area, never a gray box.

import type { ReactNode } from 'react';
import { Icon, type IconName } from './icon';

type EmptyStateProps = {
    icon: IconName;
    title: string;
    children: ReactNode;
    action?: ReactNode;
};

// Renders the empty state; `children` is the one-line explanation and `action` an optional single button or link.
export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-start gap-3 py-8">
            <Icon name={icon} size="nav" className="text-ink-2" />
            <p className="type-title font-semibold">{title}</p>
            <p className="max-w-measure text-ui text-ink-2">{children}</p>
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
