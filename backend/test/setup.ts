process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DATABASE_URL_UNPOOLED = '';
process.env.WEB_ORIGIN = 'http://localhost:3000';
// Fixed auth values so tests don't depend on a local .env (Bun loads it); without AUTH_URL, reset links come out relative.
process.env.AUTH_URL = 'http://localhost:4000';
process.env.AUTH_SECRET = 'test-secret-not-for-production-0123456789abcdef';

// Route tests fetch from a local fixture server the SSRF guard would block; live tests (LIVE_FEEDS=1) keep the defaults.
if (!process.env.LIVE_FEEDS) {
    process.env.FEED_ALLOW_LOOPBACK = 'true';
    process.env.FEED_FETCH_TIMEOUT_MS = '500';
    // Every fixture feed is on 127.0.0.1, so the real per-host limit would queue the tests; host-limiter.test.ts tests it.
    process.env.FEED_HOST_MAX_CONCURRENT = '50';
    process.env.FEED_HOST_MIN_INTERVAL_MS = '0';
}
