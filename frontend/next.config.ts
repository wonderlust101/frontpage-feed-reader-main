// Next.js config. allowedDevOrigins affects the dev server only: it lets phones and other machines on the home network
// (192.168.x.x) load the dev scripts, so pages are interactive when tested on other devices.
// Auth requests go to this site's /api/auth and are forwarded to the API (rewrites). The browser then sees one site, so
// it keeps the session cookie: the API is on another domain in production, and browsers drop cookies set across sites.

import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

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
    async rewrites() {
        return [{ source: '/api/auth/:path*', destination: `${API_URL}/api/auth/:path*` }];
    },
};

export default nextConfig;
