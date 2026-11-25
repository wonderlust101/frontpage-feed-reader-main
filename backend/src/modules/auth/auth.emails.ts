// The auth emails as plain text plus HTML; anything a reader typed is escaped in the HTML.

import { CODE_LIFETIME_MINUTES } from '@frontpage/shared';
import { escapeHtml, type Email } from '../../lib/email';

type ResetEmailUser = { email: string; name: string };

export const RESET_TOKEN_MINUTES = 60;

export function passwordResetEmail(user: ResetEmailUser, url: string): Email {
    const greeting = user.name ? `Hi ${user.name},` : 'Hi,';

    return {
        to: user.email,
        subject: 'Reset your Frontpage password',
        text: `${greeting}\n\nOpen this link to choose a new password (it expires in ${RESET_TOKEN_MINUTES} minutes):\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
        html: `<p>${escapeHtml(greeting)}</p><p><a href="${escapeHtml(url)}">Choose a new password</a> (the link expires in ${RESET_TOKEN_MINUTES} minutes).</p><p>If you didn't ask for this, you can ignore this email.</p>`,
    };
}

// The code is escaped too, though Better Auth only makes digits.
export function verificationCodeEmail(to: string, code: string): Email {
    return {
        to,
        // No code in the subject: subjects are written to the server log when sending fails or is skipped.
        subject: 'Your Frontpage confirmation code',
        text: `Your Frontpage code is ${code}\n\nEnter it to confirm your email address. It expires in ${CODE_LIFETIME_MINUTES} minutes.\n\nIf you didn't create an account, you can ignore this email.`,
        html: `<p>Your Frontpage code is</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${escapeHtml(code)}</p><p>Enter it to confirm your email address. It expires in ${CODE_LIFETIME_MINUTES} minutes.</p><p>If you didn't create an account, you can ignore this email.</p>`,
    };
}
