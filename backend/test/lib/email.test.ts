// sendEmail's no-API-key paths (Mailpit, log, skip) and escapeHtml. Real sending is not tested (it would need the network
// and a Resend key); Mailpit is a local stub server that records what it receives.

import { afterAll, afterEach, beforeAll, describe, expect, mock, spyOn, test } from 'bun:test';
import { escapeHtml, sendEmail } from '../../src/lib/email';

const EMAIL = { to: 'a@example.com', subject: 'Hello', text: 'Hi there', html: '<p>Hi there</p>' };

let mailpit: ReturnType<typeof Bun.serve>;
let mailpitStatus = 200;
const mailpitRequests: { path: string; body: unknown }[] = [];

beforeAll(() => {
    mailpit = Bun.serve({
        port: 0,
        async fetch(req) {
            mailpitRequests.push({ path: new URL(req.url).pathname, body: await req.json() });

            return Response.json({ ID: 'stub' }, { status: mailpitStatus });
        },
    });
});

// Runs even when an assertion fails, so a spy or a refusing Mailpit never leaks into the next test.
afterEach(() => {
    mock.restore();
    mailpitStatus = 200;
});

afterAll(async () => {
    await mailpit.stop(true);
});

describe('sendEmail to Mailpit (no API key, MAILPIT_URL set)', () => {
    test('posts the email to the send API outside production', async () => {
        const result = await sendEmail(EMAIL, { apiKey: undefined, from: 'Frontpage <hi@example.com>', production: false, mailpitUrl: mailpit.url.href });

        expect(result).toBe('captured');
        expect(mailpitRequests.at(-1)).toEqual({
            path: '/api/v1/send',
            body: { From: { Email: 'hi@example.com' }, To: [{ Email: 'a@example.com' }], Subject: 'Hello', Text: 'Hi there', HTML: '<p>Hi there</p>' },
        });
    });

    test('uses a local sender address when EMAIL_FROM is unset', async () => {
        await sendEmail(EMAIL, { apiKey: undefined, from: undefined, production: false, mailpitUrl: mailpit.url.href });
        expect(mailpitRequests.at(-1)?.body).toMatchObject({ From: { Email: 'frontpage@localhost' } });
    });

    test('is never used in production', async () => {
        const before = mailpitRequests.length;

        spyOn(console, 'warn').mockImplementation(() => {});

        expect(await sendEmail(EMAIL, { apiKey: undefined, from: 'x@example.com', production: true, mailpitUrl: mailpit.url.href })).toBe('skipped');
        expect(mailpitRequests.length).toBe(before);
    });

    test('throws when Mailpit refuses the email', async () => {
        mailpitStatus = 400;
        await expect(sendEmail(EMAIL, { apiKey: undefined, from: undefined, production: false, mailpitUrl: mailpit.url.href })).rejects.toThrow(
            'Mailpit answered 400',
        );
    });
});

describe('sendEmail without an API key', () => {
    test('logs the email outside production', async () => {
        const log = spyOn(console, 'log').mockImplementation(() => {});

        expect(await sendEmail(EMAIL, { apiKey: undefined, from: 'x@example.com', production: false })).toBe('logged');
        expect(log.mock.calls[0]?.[0]).toContain('Hi there');
    });

    test('skips with a warning in production', async () => {
        const warn = spyOn(console, 'warn').mockImplementation(() => {});

        expect(await sendEmail(EMAIL, { apiKey: undefined, from: 'x@example.com', production: true })).toBe('skipped');
        expect(warn).toHaveBeenCalled();
    });
});

describe('escapeHtml', () => {
    test('escapes the characters that matter in HTML', () => {
        expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;');
    });
});
