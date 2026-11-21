// Next.js config. allowedDevOrigins affects the dev server only: it lets phones and other machines on the home network
// (192.168.x.x) load the dev scripts, so pages are interactive when tested on other devices.

import type { NextConfig } from 'next';

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
};

export default nextConfig;
