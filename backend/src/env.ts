// Typed environment variables, each documented in backend/.env.example. Deployment URLs default from packages/shared by
// RAILWAY_ENVIRONMENT_NAME; an unknown Railway environment gets none, so production's startup checks stop it.

import { DEPLOYMENTS, type Deployment } from '@frontpage/shared';

const deployment = deploymentDefaults(process.env.RAILWAY_ENVIRONMENT_NAME);

export const env = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: int(process.env.PORT, 4000),
    WEB_ORIGINS: (optional(process.env.WEB_ORIGIN) ?? deployment?.siteUrl ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),

    DATABASE_URL: optional(process.env.DATABASE_URL),

    AUTH_SECRET: optional(process.env.AUTH_SECRET),
    AUTH_URL: optional(process.env.AUTH_URL) ?? deployment?.apiUrl,
    AUTH_COOKIE_DOMAIN: optional(process.env.AUTH_COOKIE_DOMAIN) ?? deployment?.cookieDomain,
    AUTH_COOKIE_PREFIX: optional(process.env.AUTH_COOKIE_PREFIX) ?? deployment?.cookiePrefix,

    RESEND_API_KEY: optional(process.env.RESEND_API_KEY),
    EMAIL_FROM: optional(process.env.EMAIL_FROM),
    MAILPIT_URL: optional(process.env.MAILPIT_URL),

    FEED_FETCH_TIMEOUT_MS: int(process.env.FEED_FETCH_TIMEOUT_MS, 10_000),
    FEED_USER_AGENT: process.env.FEED_USER_AGENT ?? 'Frontpage/0.1 (RSS reader)',
    FEED_MAX_CONCURRENCY: int(process.env.FEED_MAX_CONCURRENCY, 5),
    FEED_MIN_REFETCH_MINUTES: int(process.env.FEED_MIN_REFETCH_MINUTES, 15),
    FEED_ALLOW_LOOPBACK: process.env.FEED_ALLOW_LOOPBACK === 'true',

    FEED_REFRESH_INTERVAL_MINUTES: int(process.env.FEED_REFRESH_INTERVAL_MINUTES, 30),
};

// undefined for a Railway environment the map doesn't know (e.g. a PR environment); not on Railway means local.
export function deploymentDefaults(name: string | undefined): Deployment | undefined {
    if (!name)
        return DEPLOYMENTS.local;

    return name === 'production' || name === 'staging' ? DEPLOYMENTS[name] : undefined;
}

function optional(value: string | undefined) {
    return value?.trim() || undefined;
}

// `fallback` when missing or not a number (e.g. "abc").
function int(value: string | undefined, fallback: number) {
    const n = Number.parseInt(value ?? '', 10);

    return Number.isFinite(n) ? n : fallback;
}
