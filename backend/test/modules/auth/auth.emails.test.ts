import { describe, expect, test } from 'bun:test';
import { passwordResetEmail, verificationCodeEmail } from '../../../src/modules/auth/auth.emails';

describe('verificationCodeEmail', () => {
    test('puts the code in the text and HTML but not in the subject', () => {
        const email = verificationCodeEmail('ada@example.com', '123456');

        expect(email.to).toBe('ada@example.com');
        expect(email.text).toContain('123456');
        expect(email.html).toContain('123456');
        expect(email.subject).not.toContain('123456');
    });
});

describe('passwordResetEmail', () => {
    const URL_WITH_QUERY = 'http://localhost:4000/api/auth/reset-password/abc?callbackURL=http%3A%2F%2Fx&a=1';

    test('escapes the name and link in the HTML and keeps the raw link in the text', () => {
        const email = passwordResetEmail({ email: 'ada@example.com', name: '<b>Ada</b>' }, URL_WITH_QUERY);

        expect(email.to).toBe('ada@example.com');
        expect(email.html).toContain('Hi &lt;b&gt;Ada&lt;/b&gt;,');
        expect(email.html).toContain('href="http://localhost:4000/api/auth/reset-password/abc?callbackURL=http%3A%2F%2Fx&amp;a=1"');
        expect(email.html).not.toContain('<b>');
        expect(email.text).toContain(URL_WITH_QUERY);
    });

    test('greets with just "Hi," when the user has no name', () => {
        const email = passwordResetEmail({ email: 'anon@example.com', name: '' }, URL_WITH_QUERY);

        expect(email.text.startsWith('Hi,\n')).toBe(true);
    });
});
