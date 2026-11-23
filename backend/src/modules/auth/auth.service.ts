// The Better Auth instance: email + password sign-up/sign-in, sessions in Postgres, password reset by email link and
// email verification by 6-digit code (emailOTP plugin; a correct code also signs the user in).
// The plugin's other code flows (sign-in, password reset, email change by code) are switched off: nothing uses them.
// Better Auth serves its own endpoints under /api/auth (see auth.controller.ts); other modules only call getSession().
// Without a database there is no auth: `auth` is null and auth routes answer 503.

import { CODE_LENGTH, CODE_LIFETIME_MINUTES, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@frontpage/shared';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { fromNodeHeaders } from 'better-auth/node';
import { emailOTP } from 'better-auth/plugins/email-otp';
import type { IncomingHttpHeaders } from 'node:http';
import { db } from '../../db';
import { env } from '../../env';
import { escapeHtml, sendEmail, type Email } from '../../lib/email';
import { accounts, sessions, users, verifications } from './auth.schema';

type AuthDatabase = Parameters<typeof drizzleAdapter>[0];

type ResetEmailUser = { email: string; name: string };

type SendAuthEmail = (email: Email) => Promise<void>;

const SESSION_DAYS = 30;
const SECONDS_PER_DAY = 60 * 60 * 24;
const RESET_TOKEN_MINUTES = 60;
const MIN_SECRET_LENGTH = 32;

const UNUSED_CODE_PATHS = [
    '/sign-in/email-otp',
    '/email-otp/check-verification-otp',
    '/email-otp/request-password-reset',
    '/forget-password/email-otp',
    '/email-otp/reset-password',
    '/email-otp/request-email-change',
    '/email-otp/change-email',
];

export const auth = db ? createAuth(db) : null;

// The signed-in user and session for these request headers (from the session cookie), or null when not signed in or without a database.
export async function getSession(headers: IncomingHttpHeaders) {
    if (!auth) {
        return null;
    }

    return auth.api.getSession({ headers: fromNodeHeaders(headers) });
}

// Builds a Better Auth instance on a Drizzle database: the app's one at startup, an in-memory one in tests.
// `send` delivers the reset and code emails; tests pass one that just records them.
export function createAuth(database: AuthDatabase, send: SendAuthEmail = deliverEmail) {
    // Without a fixed base URL, Better Auth builds reset links from the request's Host header, which a client controls.
    if (env.NODE_ENV === 'production' && !env.AUTH_URL) {
        throw new Error('AUTH_URL is required in production: password-reset links are built from it');
    }
    // The secret signs session cookies: a missing or short one would let someone forge a sign-in.
    if (env.NODE_ENV === 'production' && (env.AUTH_SECRET?.length ?? 0) < MIN_SECRET_LENGTH) {
        throw new Error(`AUTH_SECRET is required in production and must be at least ${MIN_SECRET_LENGTH} characters`);
    }

    return betterAuth({
        appName: 'Frontpage',
        baseURL: env.AUTH_URL,
        secret: env.AUTH_SECRET,
        trustedOrigins: env.WEB_ORIGINS,
        database: drizzleAdapter(database, {
            provider: 'pg',
            schema: { user: users, session: sessions, account: accounts, verification: verifications },
        }),
        emailAndPassword: {
            enabled: true,
            minPasswordLength: MIN_PASSWORD_LENGTH,
            maxPasswordLength: MAX_PASSWORD_LENGTH,
            resetPasswordTokenExpiresIn: RESET_TOKEN_MINUTES * 60,
            revokeSessionsOnPasswordReset: true,
            sendResetPassword: async ({ user, url }) => {
                // Not awaited, so the response time doesn't reveal whether the email exists.
                void send(passwordResetEmail(user, url));
            },
        },
        // With overrideDefaultEmailVerification below, this core sendOnSignUp (not the plugin's sendVerificationOnSignUp) emails the code.
        emailVerification: { sendOnSignUp: true, autoSignInAfterVerification: true },
        plugins: [
            emailOTP({
                otpLength: CODE_LENGTH,
                expiresIn: CODE_LIFETIME_MINUTES * 60,
                overrideDefaultEmailVerification: true,
                storeOTP: 'hashed',
                sendVerificationOTP: async ({ email, otp, type }) => {
                    if (type === 'email-verification') {
                        // Not awaited, for the same reason as the reset email.
                        void send(verificationCodeEmail(email, otp));
                    }
                },
            }),
        ],
        disabledPaths: UNUSED_CODE_PATHS,
        session: {
            expiresIn: SESSION_DAYS * SECONDS_PER_DAY,
            updateAge: SECONDS_PER_DAY,
        },
        // Better Auth only rate-limits when NODE_ENV is 'production'; keep it on unless we're running tests.
        rateLimit: { enabled: env.NODE_ENV !== 'test' },
        advanced: {
            // One query per session check (session joined to its user) instead of two; needs the relations in auth.schema.ts.
            database: { joins: true },
            // Better Auth skips its origin and redirect-address checks when NODE_ENV is 'test'; always run them, so tests prove they work.
            disableOriginCheck: false,
        },
    });
}

// The password-reset email for `user`: plain text plus HTML, with the name and link escaped in the HTML.
export function passwordResetEmail(user: ResetEmailUser, url: string): Email {
    const greeting = user.name ? `Hi ${user.name},` : 'Hi,';

    return {
        to: user.email,
        subject: 'Reset your Frontpage password',
        text: `${greeting}\n\nOpen this link to choose a new password (it expires in ${RESET_TOKEN_MINUTES} minutes):\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
        html: `<p>${escapeHtml(greeting)}</p><p><a href="${escapeHtml(url)}">Choose a new password</a> (the link expires in ${RESET_TOKEN_MINUTES} minutes).</p><p>If you didn't ask for this, you can ignore this email.</p>`,
    };
}

// The email-verification email: the code in plain text and HTML (escaped, though Better Auth only makes digits).
export function verificationCodeEmail(to: string, code: string): Email {
    return {
        to,
        // No code in the subject: subjects are written to the server log when sending fails or is skipped.
        subject: 'Your Frontpage confirmation code',
        text: `Your Frontpage code is ${code}\n\nEnter it to confirm your email address. It expires in ${CODE_LIFETIME_MINUTES} minutes.\n\nIf you didn't create an account, you can ignore this email.`,
        html: `<p>Your Frontpage code is</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${escapeHtml(code)}</p><p>Enter it to confirm your email address. It expires in ${CODE_LIFETIME_MINUTES} minutes.</p><p>If you didn't create an account, you can ignore this email.</p>`,
    };
}

// Sends an auth email; logs (never throws) when sending fails, because nobody is waiting on it.
async function deliverEmail(email: Email) {
    try {
        await sendEmail(email, {
            apiKey: env.RESEND_API_KEY,
            from: env.EMAIL_FROM,
            production: env.NODE_ENV === 'production',
            mailpitUrl: env.MAILPIT_URL,
        });
    } catch (err) {
        console.error(`Email "${email.subject}" failed:`, err instanceof Error ? err.message : err);
    }
}
