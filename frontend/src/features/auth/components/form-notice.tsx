'use client';

// A message at the top of an auth form ("Check your inbox.", "Password changed.", or an error), drawn in the fields'
// language rather than the page Notice's: a rounded box with a field's edge (1.5px control edge; 2px error edge for
// errors, like an invalid field), its icon inset to line up with the text inside the fields. The lead says what
// happened on its own line; the sentence under it is full ink, so it never reads weaker than the field errors below.
// A notice that a step's result brings in takes keyboard focus (pass `focusKey`), so screen reader and keyboard users
// land on it instead of the top of the page; it shows no ring, as it is a message, not a control.

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

type FormNoticeTone = 'neutral' | 'error';

type FormNoticeProps = {
    tone?: FormNoticeTone;
    icon: IconName;
    lead: string;
    children: ReactNode;
    action?: ReactNode;
    focusKey?: string | number | boolean;
};

// Edge and inset per tone: the left padding takes up the difference in edge width, so the icon starts 20px in either way.
const TONE_CLASSES: Record<FormNoticeTone, { box: string; accent: string }> = {
    neutral: { box: 'border-[1.5px] border-control-edge pl-[1.15625rem]', accent: 'text-ink' },
    error: { box: 'border-2 border-error pl-[1.125rem]', accent: 'text-error' },
};

// Renders the box; `action` (a button or link) sits under the sentence, on the text's inset. With `focusKey`, the box
// takes focus when it appears and again whenever the key changes (FormAlert passes its message).
export function FormNotice({ tone = 'neutral', icon, lead, children, action, focusKey }: FormNoticeProps) {
    const noticeRef = useRef<HTMLDivElement>(null);
    const takesFocus = focusKey !== undefined;
    const { box, accent } = TONE_CLASSES[tone];

    useEffect(() => {
        if (takesFocus) {
            noticeRef.current?.focus();
        }
    }, [takesFocus, focusKey]);

    return (
        <div ref={noticeRef} tabIndex={takesFocus ? -1 : undefined} role="status" className={`rounded-control bg-control-fill py-4 pr-5 ${box}`}>
            <p className="flex items-start gap-3 text-ui text-ink">
                <Icon name={icon} size="action" className={`mt-0.5 ${accent}`} />
                <span>
                    <strong className={`block font-semibold ${accent}`}>{lead}</strong>
                    {children}
                </span>
            </p>
            {action && <div className="mt-4 pl-8">{action}</div>}
        </div>
    );
}
