// An inline message for a state the reader should know but need not act on at once (offline, a failing feed).

import type { ReactNode } from 'react';
import { Icon, type IconName } from './icon';

type NoticeTone = 'neutral' | 'warning' | 'error';

type NoticeProps = {
    tone?: NoticeTone;
    icon: IconName;
    lead: string;
    children: ReactNode;
    action?: ReactNode;
};

const TONE_CLASSES: Record<NoticeTone, string> = {
    neutral: 'text-ink',
    warning: 'text-warning',
    error: 'text-error',
};

export function Notice({ tone = 'neutral', icon, lead, children, action }: NoticeProps) {
    return (
        <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-rule py-3">
            <p className="flex flex-1 items-start gap-3 text-ui">
                <Icon name={icon} size="action" className={TONE_CLASSES[tone]} />
                <span>
                    <strong className={`font-semibold ${TONE_CLASSES[tone]}`}>{lead}</strong> <span className="text-ink-2">{children}</span>
                </span>
            </p>
            {action}
        </div>
    );
}
