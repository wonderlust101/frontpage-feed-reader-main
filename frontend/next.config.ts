// Deployment URLs come from the committed map in packages/shared, picked by VERCEL_ENV at build time; a set variable
// still wins. They go into the build through `env`, so a deployment never falls back to localhost by accident.

import { DEPLOYMENTS, type DeploymentName } from '@frontpage/shared';
import type { NextConfig } from 'next';

const DEPLOYMENT = DEPLOYMENTS[vercelDeployment(process.env.VERCEL_ENV)];

const DEPLOYMENT_ENV = {
    API_URL: process.env.API_URL || DEPLOYMENT.apiUrl,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || DEPLOYMENT.apiUrl,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || DEPLOYMENT.siteUrl,
    AUTH_COOKIE_PREFIX: process.env.AUTH_COOKIE_PREFIX || DEPLOYMENT.cookiePrefix || '',
};

const PUBLIC_API_ORIGIN = new URL(DEPLOYMENT_ENV.NEXT_PUBLIC_API_URL).origin;

const IS_DEV = process.env.NODE_ENV === 'development';

// Static, not nonce-based: nonces need every page rendered per request, which would switch off the static shells Cache
// Components prerenders. Those shells carry inline Next scripts, and React's style={…} needs inline styles.
const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${PUBLIC_API_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ');

const BASELINE_HEADERS = [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
    env: DEPLOYMENT_ENV,
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
        return [{ source: '/:path*', headers: securityHeaders(IS_DEV) }];
    },
};

export default nextConfig;

// The dev server gets no Content Security Policy, which would block dev tools and injected scripts.
export function securityHeaders(isDevelopment: boolean): { key: string; value: string }[] {
    return isDevelopment ? BASELINE_HEADERS : [{ key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY }, ...BASELINE_HEADERS];
}

// Unset (not on Vercel) or "development" is local; throws on a value Vercel doesn't document rather than guessing.
export function vercelDeployment(vercelEnv: string | undefined): DeploymentName {
    if (!vercelEnv || vercelEnv === 'development')
        return 'local';

    if (vercelEnv === 'production')
        return 'production';

    if (vercelEnv === 'preview')
        return 'staging';

    throw new Error(`Unknown VERCEL_ENV "${vercelEnv}": add it to vercelDeployment in next.config.ts`);
}
