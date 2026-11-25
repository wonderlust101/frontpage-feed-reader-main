// The Better Auth instance: email + password, sessions in Postgres, reset by link and email verification by code.
// Without a database there is no auth: `auth` is null and auth routes answer 503.

import { CODE_LENGTH, CODE_LIFETIME_MINUTES, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@frontpage/shared';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { fromNodeHeaders } from 'better-auth/node';
import { emailOTP } from 'better-auth/plugins/email-otp';
import type { IncomingHttpHeaders } from 'node:http';
import { db } from '../../db';
import { env } from '../../env';
import { sendEmail, type Email } from '../../lib/email';
import { passwordResetEmail, RESET_TOKEN_MINUTES, verificationCodeEmail } from './auth.emails';
import { accounts, sessions, users, verifications } from './auth.schema';

type AuthDatabase = Parameters<typeof drizzleAdapter>[0];

type RateLimitRule = { window: number; max: number };

type SendAuthEmail = (email: Email) => Promise<void>;

const SESSION_DAYS = 30;
const SECONDS_PER_DAY = 60 * 60 * 24;
const MIN_SECRET_LENGTH = 32;
const DEV_RATE_LIMIT_DIVISOR = 10;

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
    if (!auth)
        return null;

    return auth.api.getSession({ headers: fromNodeHeaders(headers) });
}

// `send` delivers the reset and code emails; tests pass one that records them.
export function createAuth(database: AuthDatabase, send: SendAuthEmail = deliverEmail) {
    assertProductionAuthConfig();

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
        // Better Auth only rate-limits in production, so keep it on outside tests, with windows a tenth as long locally.
        // Session checks are never limited: they come from the site's few server IPs and need a valid cookie anyway.
        rateLimit: {
            enabled: env.NODE_ENV !== 'test',
            customRules: {
                '/get-session': false,
                ...(env.NODE_ENV === 'production' ? {} : { '/**': shortenRateLimitWindow }),
            },
        },
        advanced: {
            // One query per session check (session joined to its user) instead of two; needs the relations in auth.schema.ts.
            database: { joins: true },
            // Site and API share one domain, so the cookie is set for all of it; unset locally, where ports already share cookies.
            crossSubDomainCookies: env.AUTH_COOKIE_DOMAIN ? { enabled: true, domain: env.AUTH_COOKIE_DOMAIN } : undefined,
            // A different name on staging keeps production's cookie (set for all of readfrontpage.com) out; proxy.ts reads it too.
            cookiePrefix: env.AUTH_COOKIE_PREFIX,
            // Railway's edge puts the reader's IP in X-Real-IP; rate limits and sessions use it (locally it falls back to 127.0.0.1).
            ipAddress: { ipAddressHeaders: ['x-real-ip'] },
            // Better Auth skips its origin and redirect-address checks when NODE_ENV is 'test'; always run them, so tests prove they work.
            disableOriginCheck: false,
        },
    });
}

// A missing setting would leave production quietly broken, so the server refuses to start; the first missing one is reported.
function assertProductionAuthConfig() {
    if (env.NODE_ENV !== 'production')
        return;

    // Without a fixed base URL, Better Auth builds reset links from the request's Host header, which a client controls.
    if (!env.AUTH_URL) {
        throw new Error(
            'AUTH_URL is required in production: password-reset links are built from it (set it, or add this Railway environment to packages/shared/src/deployments.ts)',
        );
    }

    // Without an allowed origin, the browser's CORS check and Better Auth's origin check would refuse every sign-in.
    if (env.WEB_ORIGINS.length === 0) {
        throw new Error(
            'WEB_ORIGIN is required in production: the site that may call the API (set it, or add this Railway environment to packages/shared/src/deployments.ts)',
        );
    }

    // The secret signs session cookies: a missing or short one would let someone forge a sign-in.
    if ((env.AUTH_SECRET?.length ?? 0) < MIN_SECRET_LENGTH)
        throw new Error(`AUTH_SECRET is required in production and must be at least ${MIN_SECRET_LENGTH} characters`);

    // Without it the cookie belongs to the API's host only, and the site's pages would never see anyone signed in.
    if (!env.AUTH_COOKIE_DOMAIN) {
        throw new Error(
            'AUTH_COOKIE_DOMAIN is required in production: the site and the API share the session cookie through it (set it, or add this Railway environment to packages/shared/src/deployments.ts)',
        );
    }
}

// Outside production every window is a tenth as long, so local testing rarely waits but still hits the limits.
function shortenRateLimitWindow(_fetchRequest: Request, rule: RateLimitRule): RateLimitRule {
    return { ...rule, window: Math.ceil(rule.window / DEV_RATE_LIMIT_DIVISOR) };
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
