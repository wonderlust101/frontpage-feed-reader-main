// Central, typed access to environment variables. See apps/api/.env.example.

const optional = (value: string | undefined) => value?.trim() || undefined;
const int = (value: string | undefined, fallback: number) => {
    const n = Number.parseInt(value ?? '', 10);
    return Number.isFinite(n) ? n : fallback;
};

export const env = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: int(process.env.PORT, 4000),
    WEB_ORIGINS: (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),

    DATABASE_URL: optional(process.env.DATABASE_URL),

    AUTH_SECRET: optional(process.env.AUTH_SECRET),
    AUTH_URL: optional(process.env.AUTH_URL),

    RESEND_API_KEY: optional(process.env.RESEND_API_KEY),
    EMAIL_FROM: optional(process.env.EMAIL_FROM),

    FEED_FETCH_TIMEOUT_MS: int(process.env.FEED_FETCH_TIMEOUT_MS, 10_000),
    FEED_USER_AGENT: process.env.FEED_USER_AGENT ?? 'Frontpage/0.1 (RSS reader)',
    FEED_MAX_CONCURRENCY: int(process.env.FEED_MAX_CONCURRENCY, 5),
    FEED_MIN_REFETCH_MINUTES: int(process.env.FEED_MIN_REFETCH_MINUTES, 15),
    // SSRF guard: feeds on localhost/private networks are refused unless this is true (tests only).
    FEED_ALLOW_PRIVATE_HOSTS: process.env.FEED_ALLOW_PRIVATE_HOSTS === 'true',

    // Background refresh of all feeds; 0 disables it.
    FEED_REFRESH_INTERVAL_MINUTES: int(process.env.FEED_REFRESH_INTERVAL_MINUTES, 30),
};
