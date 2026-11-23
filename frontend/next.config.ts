// Next.js config. allowedDevOrigins affects the dev server only: it lets phones and other machines on the home network
// (192.168.x.x) load the dev scripts, so pages are interactive when tested on other devices.
// Every response gets baseline security headers: no framing (clickjacking), no MIME sniffing, a trimmed Referer, and
// no camera, microphone or location, plus a Content Security Policy. Everything the app loads is on this site, and the
// browser calls one other origin, the API (NEXT_PUBLIC_API_URL, for auth), so the policy allows 'self' plus that
// origin for requests only: no scripts from other sites, no requests elsewhere, and forms submit here.
// The policy is static rather than nonce-based: nonces need every page rendered per request, which would switch off
// the static shells Cache Components prerenders, and those shells carry inline Next scripts, so script-src keeps
// 'unsafe-inline'. style-src does too, for React's style={…} attributes, which nonces can't cover anyway.

import type { NextConfig } from 'next';

// Read when the app is built: the policy is fixed then, as is the API address in the browser bundle (auth-client.ts).
const PUBLIC_API_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').origin;

const IS_DEV = process.env.NODE_ENV === 'development';

const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    // React's dev build uses eval to rebuild server error stacks in the browser; production never does.
    `script-src 'self' 'unsafe-inline'${IS_DEV ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${PUBLIC_API_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS = [
    { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
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
};

export default nextConfig;
