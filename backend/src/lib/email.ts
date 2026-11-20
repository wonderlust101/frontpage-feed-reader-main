// Sends transactional email through Resend's REST API (plain fetch, no SDK).
// Without RESEND_API_KEY nothing is sent: outside production the message is logged instead, so password reset works locally.

export type Email = {
    to: string;
    subject: string;
    text: string;
    html: string;
};

export type EmailConfig = {
    apiKey: string | undefined;
    from: string | undefined;
    production: boolean;
};

const RESEND_URL = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 10_000;

// Sends one email. Returns 'sent', 'logged' (no API key, not production) or 'skipped' (no API key in production).
// Throws if Resend rejects the message or can't be reached.
export async function sendEmail(email: Email, config: EmailConfig): Promise<'sent' | 'logged' | 'skipped'> {
    if (!config.apiKey || !config.from) {
        if (config.production) {
            console.warn(`Email not sent (RESEND_API_KEY or EMAIL_FROM missing): "${email.subject}"`);
            return 'skipped';
        }

        console.log(`[email] to ${email.to}: ${email.subject}\n${email.text}`);
        return 'logged';
    }

    const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.from, to: email.to, subject: email.subject, text: email.text, html: email.html }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!res.ok) {
        throw new Error(`Resend answered ${res.status}: ${await res.text()}`);
    }

    return 'sent';
}

// Escapes text for use inside HTML, e.g. a user's name in an email body.
export function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
