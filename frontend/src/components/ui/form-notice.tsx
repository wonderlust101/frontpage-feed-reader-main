'use client';

// A message at the top of a form or step ("Sent to ada@example.com", "All set.", "New code sent.", or an error), drawn in
// the fields' language rather than the page Notice's: a rounded box with a field's edge (1.5px control edge; 2px error
// edge for errors, like an invalid field), its icon inset to line up with the text inside the fields. The lead says
// what happened on its own line; the sentence under it is full ink, so it never reads weaker than the field errors.
// A notice that a step's result brings in takes keyboard focus when it appears (`takesFocus`), so screen reader and
// keyboard users land on it instead of the top of the page; it shows no ring, as it is a message, not a control. To
// take focus again for a new message, the caller gives it a new React `key` (FormAlert keys it by its message).
// A notice that takes focus is a group named by its lead and described by its sentence, so focusing it reads both.
// One that doesn't is a live region instead: role="alert" for errors, role="status" for the rest.

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

// Renders the box; `action` (a button or link) sits under the sentence, on the text's inset.
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
        if (takesFocus) {
            noticeRef.current?.focus();
        }
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
