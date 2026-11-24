'use client';

// With `takesFocus` it takes focus when it appears (a new `key` takes focus again) and is a group named by its lead;
// otherwise it is a live region: role="alert" for errors, role="status" for the rest.

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon, type IconName } from './icon';

type FormNoticeTone = 'neutral' | 'error';

type FormNoticeProps = {
    tone?: FormNoticeTone;
    icon: IconName;
    lead: string;
    children: ReactNode;
    action?: ReactNode;
    takesFocus?: boolean;
};

// Edge and inset per tone: the left padding takes up the difference in edge width, so the icon starts 20px in either way.
const TONE_CLASSES: Record<FormNoticeTone, { box: string; accent: string }> = {
    neutral: { box: 'border-[1.5px] border-control-edge pl-[1.15625rem]', accent: 'text-ink' },
    error: { box: 'border-2 border-error pl-[1.125rem]', accent: 'text-error' },
};

export function FormNotice({ tone = 'neutral', icon, lead, children, action, takesFocus = false }: FormNoticeProps) {
    const noticeRef = useRef<HTMLDivElement>(null);
    const { box, accent } = TONE_CLASSES[tone];
    const id = useId();
    const leadId = `${id}-lead`;
    const bodyId = `${id}-body`;
    const roleProps = takesFocus
        ? { role: 'group', tabIndex: -1, 'aria-labelledby': leadId, 'aria-describedby': bodyId }
        : { role: tone === 'error' ? 'alert' : 'status' };

    useEffect(() => {
        if (takesFocus)
            noticeRef.current?.focus();
    }, [takesFocus]);

    return (
        <div ref={noticeRef} {...roleProps} className={`rounded-control bg-control-fill py-4 pr-5 ${box}`}>
            <p className="flex items-start gap-3 text-ui text-ink">
                <Icon name={icon} size="action" className={`mt-0.5 ${accent}`} />
                <span>
                    <strong id={leadId} className={`block font-semibold ${accent}`}>
                        {lead}
                    </strong>
                    <span id={bodyId}>{children}</span>
                </span>
            </p>
            {action && <div className="mt-4 pl-8">{action}</div>}
        </div>
    );
}
