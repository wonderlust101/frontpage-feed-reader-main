// The Better Auth instance: email + password sign-up/sign-in, sessions in Postgres, password reset by email.
// Better Auth serves its own endpoints under /api/auth (see auth.controller.ts); other modules only call getSession().
// Without a database there is no auth: `auth` is null and auth routes answer 503.

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';
import { db } from '../../db';
import { env } from '../../env';
import { escapeHtml, sendEmail } from '../../lib/email';
import { accounts, sessions, users, verifications } from './auth.schema';

type AuthDatabase = Parameters<typeof drizzleAdapter>[0];

type SendResetLink = (user: { email: string; name: string }, url: string) => Promise<void>;

const MIN_PASSWORD_LENGTH = 8;
const SESSION_DAYS = 30;
const SECONDS_PER_DAY = 60 * 60 * 24;
const RESET_TOKEN_MINUTES = 60;

export const auth = db ? createAuth(db) : null;

// The signed-in user and session for these request headers (from the session cookie), or null when not signed in or without a database.
export async function getSession(headers: IncomingHttpHeaders) {
    if (!auth) {
        return null;
    }

    return auth.api.getSession({ headers: fromNodeHeaders(headers) });
}

// Builds a Better Auth instance on a Drizzle database: the app's one at startup, an in-memory one in tests.
// `sendResetLink` emails the password-reset link; tests pass their own to capture it.
export function createAuth(database: AuthDatabase, sendResetLink: SendResetLink = sendPasswordResetEmail) {
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
            resetPasswordTokenExpiresIn: RESET_TOKEN_MINUTES * 60,
            revokeSessionsOnPasswordReset: true,
            sendResetPassword: async ({ user, url }) => {
                // Not awaited, so the response time doesn't reveal whether the email exists.
                void sendResetLink(user, url);
            },
        },
        session: {
            expiresIn: SESSION_DAYS * SECONDS_PER_DAY,
            updateAge: SECONDS_PER_DAY,
        },
        // One query per session check (session joined to its user) instead of two; needs the relations in auth.schema.ts.
        advanced: { database: { joins: true } },
    });
}

// Emails the password-reset link; logs (never throws) when sending fails, because nobody is waiting on it.
async function sendPasswordResetEmail(user: { email: string; name: string }, url: string) {
    const greeting = user.name ? `Hi ${user.name},` : 'Hi,';

    try {
        await sendEmail(
            {
                to: user.email,
                subject: 'Reset your Frontpage password',
                text: `${greeting}\n\nOpen this link to choose a new password (it expires in ${RESET_TOKEN_MINUTES} minutes):\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
                html: `<p>${escapeHtml(greeting)}</p><p><a href="${escapeHtml(url)}">Choose a new password</a> (the link expires in ${RESET_TOKEN_MINUTES} minutes).</p><p>If you didn't ask for this, you can ignore this email.</p>`,
            },
            { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, production: env.NODE_ENV === 'production' },
        );
    } catch (err) {
        console.error('Password reset email failed:', err instanceof Error ? err.message : err);
    }
}
