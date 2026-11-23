// Where each deployment of Frontpage lives, in one place for both sides. None of it is secret, so it is committed
// rather than repeated as variables in every Vercel and Railway environment: each side works out which deployment it
// is from what its platform already tells it (the frontend from Vercel's VERCEL_ENV, the backend from Railway's
// RAILWAY_ENVIRONMENT_NAME) and takes its URLs from here. An explicit environment variable still overrides any value.
// Staging lives under staging.readfrontpage.com, so its cookie (domain and name) never mixes with production's.
// Adding a deployment means adding a row here (and its DNS, Vercel domain and Railway environment).

export type DeploymentName = 'production' | 'staging' | 'local';

export type Deployment = {
    // The site readers open (Vercel), e.g. "https://www.readfrontpage.com".
    siteUrl: string;
    // The API the browser and the site's server call (Railway), e.g. "https://api.readfrontpage.com".
    apiUrl: string;
    // The domain the site and API share the session cookie on; none locally, where ports already share cookies.
    cookieDomain?: string;
    // The session cookie's name prefix; only staging sets one, so production's cookie is never read there.
    cookiePrefix?: string;
};

export const DEPLOYMENTS: Record<DeploymentName, Deployment> = {
    production: {
        siteUrl: 'https://www.readfrontpage.com',
        apiUrl: 'https://api.readfrontpage.com',
        cookieDomain: 'readfrontpage.com',
    },
    staging: {
        siteUrl: 'https://staging.readfrontpage.com',
        apiUrl: 'https://api.staging.readfrontpage.com',
        cookieDomain: 'staging.readfrontpage.com',
        cookiePrefix: 'frontpage-staging',
    },
    local: {
        siteUrl: 'http://localhost:3000',
        apiUrl: 'http://localhost:4000',
    },
};
