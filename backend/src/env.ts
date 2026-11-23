// Typed access to environment variables. Each one is documented in backend/.env.example.
// The deployment's URLs (allowed site origin, the API's own address, the session cookie's domain and prefix) come from
// the committed map in packages/shared (deployments.ts): Railway names the environment (RAILWAY_ENVIRONMENT_NAME,
// "production" or "staging"), and anywhere else is local. A variable that is set still wins. A Railway environment
// with no row in the map gets no defaults, so production's startup checks (auth.service.ts) stop it instead of
// letting it run with local URLs.

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

// Returns the committed settings for the Railway environment `name` ("production" or "staging"), the local ones when
// not on Railway (no name), or undefined for a Railway environment the map doesn't know (e.g. a PR environment).
export function deploymentDefaults(name: string | undefined): Deployment | undefined {
    if (!name) {
        return DEPLOYMENTS.local;
    }
    return name === 'production' || name === 'staging' ? DEPLOYMENTS[name] : undefined;
}

// An env var with surrounding spaces trimmed, or undefined when it's missing or blank.
function optional(value: string | undefined) {
    return value?.trim() || undefined;
}

// Reads a whole-number env var. Returns `fallback` when it's missing or not a number (e.g. "abc").
function int(value: string | undefined, fallback: number) {
    const n = Number.parseInt(value ?? '', 10);
    return Number.isFinite(n) ? n : fallback;
}
