// Sends transactional email through Resend's REST API. Without RESEND_API_KEY, local runs use Mailpit (a test inbox) when
// MAILPIT_URL is set, else log the message; production never uses Mailpit.

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
    mailpitUrl?: string | undefined;
};

const RESEND_URL = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 10_000;
const MAILPIT_FALLBACK_FROM = 'frontpage@localhost';

// Throws if Resend or Mailpit rejects the message or can't be reached; without an API key it logs or skips instead.
export async function sendEmail(email: Email, config: EmailConfig): Promise<'sent' | 'captured' | 'logged' | 'skipped'> {
    if (config.apiKey && config.from) {
        await sendThroughResend(email, config.apiKey, config.from);

        return 'sent';
    }

    if (config.production) {
        console.warn(`Email not sent (RESEND_API_KEY or EMAIL_FROM missing): "${email.subject}"`);

        return 'skipped';
    }

    if (config.mailpitUrl) {
        await sendToMailpit(email, config.mailpitUrl, config.from);

        return 'captured';
    }

    console.log(`[email] to ${email.to}: ${email.subject}\n${email.text}`);

    return 'logged';
}

export function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function sendThroughResend(email: Email, apiKey: string, from: string) {
    const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: email.to, subject: email.subject, text: email.text, html: email.html }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!res.ok)
        throw new Error(`Resend answered ${res.status}: ${await res.text()}`);
}

// Mailpit shows the message in the local inbox (http://localhost:8025).
async function sendToMailpit(email: Email, mailpitUrl: string, from: string | undefined) {
    const res = await fetch(new URL('/api/v1/send', mailpitUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            From: { Email: senderAddress(from) },
            To: [{ Email: email.to }],
            Subject: email.subject,
            Text: email.text,
            HTML: email.html,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!res.ok)
        throw new Error(`Mailpit answered ${res.status}: ${await res.text()}`);
}

// "Frontpage <hi@example.com>" → "hi@example.com"; a local fallback when EMAIL_FROM is unset.
function senderAddress(from: string | undefined) {
    if (!from)
        return MAILPIT_FALLBACK_FROM;

    return from.match(/<([^>]+)>/)?.[1] ?? from;
}
