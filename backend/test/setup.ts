process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DATABASE_URL_UNPOOLED = '';
process.env.WEB_ORIGIN = 'http://localhost:3000';
// Fixed auth values so tests don't depend on a local .env (Bun loads it); without AUTH_URL, reset links come out relative.
process.env.AUTH_URL = 'http://localhost:4000';
process.env.AUTH_SECRET = 'test-secret-not-for-production-0123456789abcdef';

// Route tests fetch from a local fixture server, which the SSRF guard would otherwise block,
// and use a short timeout so the timeout path is quick. Live tests (LIVE_FEEDS=1) keep the real defaults.
if (!process.env.LIVE_FEEDS) {
    process.env.FEED_ALLOW_LOOPBACK = 'true';
    process.env.FEED_FETCH_TIMEOUT_MS = '500';
}
