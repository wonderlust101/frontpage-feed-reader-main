// Next.js config. allowedDevOrigins affects the dev server only: it lets phones and other machines on the home network
// (192.168.x.x) load the dev scripts, so pages are interactive when tested on other devices.
// Every response gets baseline security headers: no framing (clickjacking), no MIME sniffing, a trimmed Referer, and
// no camera, microphone or location, plus a Content Security Policy. Everything the app loads is on this site, and the
// browser calls one other origin, the API (NEXT_PUBLIC_API_URL, for auth), so the policy allows 'self' plus that
// origin for requests only: no scripts from other sites, no requests elsewhere, and forms submit here.
// The policy is static rather than nonce-based: nonces need every page rendered per request, which would switch off
// the static shells Cache Components prerenders, and those shells carry inline Next scripts, so script-src keeps
// 'unsafe-inline'. style-src does too, for React's style={…} attributes, which nonces can't cover anyway.
// The deployment's URLs come from the committed map in packages/shared (deployments.ts), picked by Vercel's VERCEL_ENV
// when the app is built: production for the production deployment, staging for previews (staging.readfrontpage.com is
// the staging branch's preview; other previews borrow the staging API), local anywhere else. A variable that is set
// still wins (Docker sets API_URL to the API's address inside its network). They are fixed into the build through
// `env`, so the code reads plain process.env values and never falls back to localhost on a deployment by accident.

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
        return [{ source: '/:path*', headers: SECURITY_HEADERS }];
    },
};

export default nextConfig;

// Returns which deployment a build is for, from Vercel's VERCEL_ENV: unset (not on Vercel) or "development" (vercel
// dev) is local. Throws on a value Vercel doesn't document, rather than guessing.
export function vercelDeployment(vercelEnv: string | undefined): DeploymentName {
    if (!vercelEnv || vercelEnv === 'development') {
        return 'local';
    }
    if (vercelEnv === 'production') {
        return 'production';
    }
    if (vercelEnv === 'preview') {
        return 'staging';
    }
    throw new Error(`Unknown VERCEL_ENV "${vercelEnv}": add it to vercelDeployment in next.config.ts`);
}
