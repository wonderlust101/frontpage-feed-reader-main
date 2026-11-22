// Next.js config. allowedDevOrigins affects the dev server only: it lets phones and other machines on the home network
// (192.168.x.x) load the dev scripts, so pages are interactive when tested on other devices.
// Auth requests go to this site's /api/auth and are forwarded to the API (rewrites). The browser then sees one site, so
// it keeps the session cookie: the API is on another domain in production, and browsers drop cookies set across sites.
// Every response gets baseline security headers: no framing (clickjacking), no MIME sniffing, a trimmed Referer, and
// no camera, microphone or location. A Content Security Policy is a later step: it needs per-request nonces, which
// conflict with the static shell Cache Components prerenders.

import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const SECURITY_HEADERS = [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
    allowedDevOrigins: ['192.168.*.*'],
    cacheComponents: true,
    partialPrefetching: true,
    turbopack: {
        rules: {
            '*.css': {
                loaders: ['@tailwindcss/turbopack'],
                as: '*.css',
            },
        },
    },
    async headers() {
        return [{ source: '/:path*', headers: SECURITY_HEADERS }];
    },
    async rewrites() {
        return [{ source: '/api/auth/:path*', destination: `${API_URL}/api/auth/:path*` }];
    },
};

export default nextConfig;
