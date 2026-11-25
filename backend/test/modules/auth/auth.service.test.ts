// Better Auth against a real (in-memory) Postgres built from our migrations: proves the hand-written schema matches what Better Auth expects.

import { afterAll, afterEach, beforeAll, describe, expect, setSystemTime, test } from 'bun:test';
import { env } from '../../../src/env';
import type { Email } from '../../../src/lib/email';
import { createAuth } from '../../../src/modules/auth/auth.service';
import { createTestDb } from '../../helpers/test-db';

const PASSWORD = 'correct horse battery';
const NEW_PASSWORD = 'staple battery horse';
const CODE_LIFETIME_MS = 5 * 60 * 1000;
const API = 'http://localhost:4000';

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let auth: ReturnType<typeof createAuth>;
const sentEmails: Email[] = [];

beforeAll(async () => {
    testDb = await createTestDb();
    auth = createAuth(testDb.db, async (email) => {
        sentEmails.push(email);
    });
});

afterEach(() => {
    setSystemTime();
});

afterAll(async () => {
    await testDb.close();
});

// Signs up a new user and returns the Cookie header for their session.
async function signUp(email: string) {
    const { headers } = await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: 'Ada' }, returnHeaders: true });

    return cookieFrom(headers);
}

// Turns Set-Cookie response headers into a Cookie request header ("name=value; name2=value2").
function cookieFrom(headers: Headers) {
    return headers
        .getSetCookie()
        .map((cookie) => cookie.split(';')[0])
        .join('; ');
}

// The last email sent to `to`, or undefined when none was.
function lastEmailTo(to: string) {
    return sentEmails.filter((email) => email.to === to).at(-1);
}

// The reset token in the last reset email to `to` (its link ends ".../reset-password/<token>?callbackURL=...").
function resetTokenFor(to: string) {
    const link = lastEmailTo(to)?.text.match(/https?:\/\/\S+/)?.[0];

    return new URL(link!).pathname.split('/').at(-1)!;
}

// The 6-digit code in the last verification email to `to`.
function codeFor(to: string) {
    return lastEmailTo(to)?.text.match(/\b\d{6}\b/)?.[0];
}

// As production would build it (rate limits on, Secure cookies); restores the real env afterwards.
function createInProduction(overrides: Partial<Pick<typeof env, 'AUTH_URL' | 'AUTH_SECRET' | 'AUTH_COOKIE_DOMAIN' | 'AUTH_COOKIE_PREFIX' | 'WEB_ORIGINS'>> = {}) {
    const saved = {
        NODE_ENV: env.NODE_ENV,
        AUTH_URL: env.AUTH_URL,
        AUTH_SECRET: env.AUTH_SECRET,
        AUTH_COOKIE_DOMAIN: env.AUTH_COOKIE_DOMAIN,
        AUTH_COOKIE_PREFIX: env.AUTH_COOKIE_PREFIX,
        WEB_ORIGINS: env.WEB_ORIGINS,
    };

    Object.assign(env, {
        NODE_ENV: 'production',
        AUTH_SECRET: 'a-long-enough-secret-for-the-guard-0123',
        AUTH_COOKIE_DOMAIN: 'readfrontpage.com',
        ...overrides,
    });

    try {
        return createAuth(testDb.db, async () => {});
    } finally {
        Object.assign(env, saved);
    }
}

// A browser request from the site to an auth endpoint (sign-in by default), with the reader's IP as Railway's edge sets it.
function signInRequest(email: string, ip: string, path = 'sign-in/email', extra: Record<string, string> = {}) {
    return new Request(`${API}/api/auth/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', 'x-real-ip': ip },
        body: JSON.stringify({ email, password: PASSWORD, ...extra }),
    });
}

// A 6-digit code that is not `code`, for wrong-code tests.
function wrongCode(code: string) {
    return code === '000000' ? '111111' : '000000';
}

describe('production settings guard', () => {
    test('refuses to start without AUTH_URL', () => {
        expect(() => createInProduction({ AUTH_URL: undefined })).toThrow('AUTH_URL is required in production');
    });

    test('reports AUTH_URL first when several settings are missing', () => {
        const everythingMissing = { AUTH_URL: undefined, WEB_ORIGINS: [], AUTH_SECRET: undefined, AUTH_COOKIE_DOMAIN: undefined };

        expect(() => createInProduction(everythingMissing)).toThrow('AUTH_URL is required in production');
    });

    test('reports WEB_ORIGIN before AUTH_SECRET and AUTH_COOKIE_DOMAIN', () => {
        expect(() => createInProduction({ WEB_ORIGINS: [], AUTH_SECRET: undefined, AUTH_COOKIE_DOMAIN: undefined })).toThrow('WEB_ORIGIN is required');
    });

    test('refuses to start without AUTH_SECRET', () => {
        expect(() => createInProduction({ AUTH_SECRET: undefined })).toThrow('AUTH_SECRET is required');
    });

    test('refuses an AUTH_SECRET shorter than 32 characters', () => {
        expect(() => createInProduction({ AUTH_SECRET: 'too-short' })).toThrow('AUTH_SECRET is required');
    });

    test('refuses to start without an allowed site (WEB_ORIGIN)', () => {
        expect(() => createInProduction({ WEB_ORIGINS: [] })).toThrow('WEB_ORIGIN is required');
    });

    test('refuses to start without AUTH_COOKIE_DOMAIN', () => {
        expect(() => createInProduction({ AUTH_COOKIE_DOMAIN: undefined })).toThrow('AUTH_COOKIE_DOMAIN is required');
    });

    test('starts with a long enough AUTH_SECRET and a cookie domain', () => {
        expect(() => createInProduction()).not.toThrow();
    });
});

describe('production cookies and rate limits', () => {
    test('the session cookie is set for the whole shared domain, so the site sees it too', async () => {
        const prodAuth = createInProduction();
        const res = await prodAuth.handler(signInRequest('nobody-yet@example.com', '203.0.113.1', 'sign-up/email', { name: 'Ada' }));

        expect(res.status).toBe(200);

        const sessionCookie = res.headers.getSetCookie().find((cookie) => cookie.includes('session_token'));

        expect(sessionCookie).toContain('Domain=readfrontpage.com');
    });

    test('staging names its cookie with AUTH_COOKIE_PREFIX, so the production cookie is never read as its own', async () => {
        const stagingAuth = createInProduction({ AUTH_COOKIE_DOMAIN: 'staging.readfrontpage.com', AUTH_COOKIE_PREFIX: 'frontpage-staging' });
        const res = await stagingAuth.handler(signInRequest('staging@example.com', '203.0.113.2', 'sign-up/email', { name: 'Ada' }));
        const sessionCookie = res.headers.getSetCookie().find((cookie) => cookie.includes('session_token'));

        expect(sessionCookie).toStartWith('frontpage-staging.session_token=');
        expect(sessionCookie).toContain('Domain=staging.readfrontpage.com');
    });

    test('each reader (X-Real-IP) gets their own sign-in limit', async () => {
        const prodAuth = createInProduction();
        const statuses = [];

        for (let i = 0; i < 4; i += 1)
            statuses.push((await prodAuth.handler(signInRequest('ada@example.com', '203.0.113.10'))).status);

        expect(statuses).toEqual([401, 401, 401, 429]);
        expect((await prodAuth.handler(signInRequest('ada@example.com', '203.0.113.11'))).status).toBe(401);
    });

    test('session checks are never rate-limited, even from one IP (the site servers)', async () => {
        const prodAuth = createInProduction();
        const SESSION_CHECKS = 150;
        const statuses = new Set<number>();

        for (let i = 0; i < SESSION_CHECKS; i += 1) {
            const res = await prodAuth.handler(new Request(`${API}/api/auth/get-session`, { headers: { 'x-real-ip': '198.51.100.1' } }));

            statuses.add(res.status);
        }

        expect(statuses.has(429)).toBe(false);
    });
});

describe('sign up and sign in', () => {
    test('sign-up creates a user and a session cookie that getSession accepts', async () => {
        const cookie = await signUp('ada@example.com');
        const session = await auth.api.getSession({ headers: new Headers({ cookie }) });

        expect(session?.user.email).toBe('ada@example.com');
        expect(session?.user.name).toBe('Ada');
    });

    test('checking a session is one query (the session joined to its user)', async () => {
        const cookie = await signUp('joan@example.com');

        testDb.queries.length = 0;

        const session = await auth.api.getSession({ headers: new Headers({ cookie }) });

        expect(session?.user.email).toBe('joan@example.com');
        expect(testDb.queries).toHaveLength(1);
    });

    test('the same email cannot sign up twice', async () => {
        await signUp('twice@example.com');
        await expect(signUp('twice@example.com')).rejects.toThrow();
    });

    test('passwords shorter than 8 characters are rejected', async () => {
        await expect(auth.api.signUpEmail({ body: { email: 'short@example.com', password: 'short', name: 'S' } })).rejects.toThrow();
    });

    test('sign-in works with the right password and fails with a wrong one', async () => {
        await signUp('grace@example.com');

        const ok = await auth.api.signInEmail({ body: { email: 'grace@example.com', password: PASSWORD } });

        expect(ok.user.email).toBe('grace@example.com');
        await expect(auth.api.signInEmail({ body: { email: 'grace@example.com', password: 'wrong password' } })).rejects.toThrow();
    });

    test('sign-out ends the session', async () => {
        const cookie = await signUp('leaving@example.com');

        await auth.api.signOut({ headers: new Headers({ cookie }) });
        expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
    });
});

describe('password reset', () => {
    test('a reset link sets a new password and signs out existing sessions', async () => {
        const cookie = await signUp('forgetful@example.com');

        await auth.api.requestPasswordReset({ body: { email: 'forgetful@example.com', redirectTo: 'http://localhost:3000/reset-password' } });

        expect(lastEmailTo('forgetful@example.com')?.text).toContain('/api/auth/reset-password/');

        const token = resetTokenFor('forgetful@example.com');

        await auth.api.resetPassword({ body: { token, newPassword: NEW_PASSWORD } });

        expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
        await expect(auth.api.signInEmail({ body: { email: 'forgetful@example.com', password: PASSWORD } })).rejects.toThrow();

        const signedIn = await auth.api.signInEmail({ body: { email: 'forgetful@example.com', password: NEW_PASSWORD } });

        expect(signedIn.user.email).toBe('forgetful@example.com');
    });

    test('unknown emails get no link and no error', async () => {
        await auth.api.requestPasswordReset({ body: { email: 'nobody@example.com', redirectTo: 'http://localhost:3000/reset-password' } });
        expect(lastEmailTo('nobody@example.com')).toBeUndefined();
    });

    test('a used reset token cannot be used again', async () => {
        await signUp('once@example.com');
        await auth.api.requestPasswordReset({ body: { email: 'once@example.com', redirectTo: 'http://localhost:3000/reset-password' } });

        const token = resetTokenFor('once@example.com');

        await auth.api.resetPassword({ body: { token, newPassword: NEW_PASSWORD } });
        await expect(auth.api.resetPassword({ body: { token, newPassword: 'another new password' } })).rejects.toThrow();
    });
});

describe('email verification by code', () => {
    test('sign-up emails a 6-digit code', async () => {
        await signUp('coded@example.com');
        expect(lastEmailTo('coded@example.com')?.subject).toBe('Your Frontpage confirmation code');
        expect(codeFor('coded@example.com')).toMatch(/^\d{6}$/);
    });

    test('the right code verifies the email and signs the user in', async () => {
        await signUp('verify@example.com');

        const { response, headers } = await auth.api.verifyEmailOTP({
            body: { email: 'verify@example.com', otp: codeFor('verify@example.com')! },
            returnHeaders: true,
        });

        expect(response.status).toBe(true);
        expect(response.token).toBeTruthy();

        const session = await auth.api.getSession({ headers: new Headers({ cookie: cookieFrom(headers) }) });

        expect(session?.user.email).toBe('verify@example.com');
        expect(session?.user.emailVerified).toBe(true);
    });

    test('a wrong code fails with INVALID_OTP', async () => {
        await signUp('typo@example.com');

        const otp = wrongCode(codeFor('typo@example.com')!);

        await expect(auth.api.verifyEmailOTP({ body: { email: 'typo@example.com', otp } })).rejects.toMatchObject({ body: { code: 'INVALID_OTP' } });
    });

    test('a code older than its lifetime fails with OTP_EXPIRED', async () => {
        await signUp('late@example.com');
        setSystemTime(new Date(Date.now() + CODE_LIFETIME_MS + 1000));
        await expect(auth.api.verifyEmailOTP({ body: { email: 'late@example.com', otp: codeFor('late@example.com')! } })).rejects.toMatchObject({
            body: { code: 'OTP_EXPIRED' },
        });
    });

    test('after 3 wrong codes even the right one fails with TOO_MANY_ATTEMPTS', async () => {
        await signUp('guesser@example.com');

        const otp = codeFor('guesser@example.com')!;

        for (let attempt = 0; attempt < 3; attempt++)
            await expect(auth.api.verifyEmailOTP({ body: { email: 'guesser@example.com', otp: wrongCode(otp) } })).rejects.toThrow();

        await expect(auth.api.verifyEmailOTP({ body: { email: 'guesser@example.com', otp } })).rejects.toMatchObject({ body: { code: 'TOO_MANY_ATTEMPTS' } });
    });

    test('asking for a code for an unknown email sends nothing and reveals nothing', async () => {
        const result = await auth.api.sendVerificationOTP({ body: { email: 'ghost@example.com', type: 'email-verification' } });

        expect(result.success).toBe(true);
        expect(lastEmailTo('ghost@example.com')).toBeUndefined();
    });

    test('codes are stored hashed, never as the code itself', async () => {
        await signUp('hashed@example.com');

        const code = codeFor('hashed@example.com')!;
        const rows = await testDb.db.query.verifications.findMany();

        expect(rows.some((row) => row.value.includes(code))).toBe(false);
    });

    test('the code flows nothing uses (sign-in by code) are switched off', async () => {
        const res = await auth.handler(
            new Request('http://localhost:4000/api/auth/sign-in/email-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
                body: JSON.stringify({ email: 'ada@example.com', otp: '123456' }),
            }),
        );

        expect(res.status).toBe(404);
    });
});

describe('change password', () => {
    test('a wrong current password fails with INVALID_PASSWORD', async () => {
        const cookie = await signUp('changer@example.com');

        await expect(
            auth.api.changePassword({ body: { currentPassword: 'not my password', newPassword: NEW_PASSWORD }, headers: new Headers({ cookie }) }),
        ).rejects.toMatchObject({ body: { code: 'INVALID_PASSWORD' } });
    });

    test('revokeOtherSessions signs out other devices but keeps this one', async () => {
        const otherDevice = await signUp('two-devices@example.com');
        const { headers: signInHeaders } = await auth.api.signInEmail({
            body: { email: 'two-devices@example.com', password: PASSWORD },
            returnHeaders: true,
        });
        const thisDevice = cookieFrom(signInHeaders);

        const { headers } = await auth.api.changePassword({
            body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, revokeOtherSessions: true },
            headers: new Headers({ cookie: thisDevice }),
            returnHeaders: true,
        });

        // Better Auth swaps this device's session for a new one when it revokes the others.
        const thisDeviceNow = cookieFrom(headers) || thisDevice;

        expect(await auth.api.getSession({ headers: new Headers({ cookie: otherDevice }) })).toBeNull();
        expect((await auth.api.getSession({ headers: new Headers({ cookie: thisDeviceNow }) }))?.user.email).toBe('two-devices@example.com');
    });
});

describe('untrusted return addresses', () => {
    test('a reset request whose redirectTo is on an untrusted site is refused', async () => {
        await signUp('phished@example.com');

        const res = await auth.handler(
            new Request('http://localhost:4000/api/auth/request-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
                body: JSON.stringify({ email: 'phished@example.com', redirectTo: 'https://evil.example/reset-password' }),
            }),
        );

        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({ code: 'INVALID_REDIRECT_URL' });
        expect(lastEmailTo('phished@example.com')?.text ?? '').not.toContain('evil.example');
    });
});
