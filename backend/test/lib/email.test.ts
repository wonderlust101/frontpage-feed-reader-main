// sendEmail's no-API-key paths and escapeHtml. Real sending is not tested (it would need the network and a Resend key).

import { describe, expect, spyOn, test } from 'bun:test';
import { escapeHtml, sendEmail } from '../../src/lib/email';

const EMAIL = { to: 'a@example.com', subject: 'Hello', text: 'Hi there', html: '<p>Hi there</p>' };

describe('sendEmail without an API key', () => {
    test('logs the email outside production', async () => {
        const log = spyOn(console, 'log').mockImplementation(() => {});
        expect(await sendEmail(EMAIL, { apiKey: undefined, from: 'x@example.com', production: false })).toBe('logged');
        expect(log.mock.calls[0]?.[0]).toContain('Hi there');
        log.mockRestore();
    });

    test('skips with a warning in production', async () => {
        const warn = spyOn(console, 'warn').mockImplementation(() => {});
        expect(await sendEmail(EMAIL, { apiKey: undefined, from: 'x@example.com', production: true })).toBe('skipped');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe('escapeHtml', () => {
    test('escapes the characters that matter in HTML', () => {
        expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;');
    });
});
