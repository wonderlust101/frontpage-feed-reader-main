// Where each deployment lives, committed because none of it is secret. Each side picks its row from what its platform
// says (VERCEL_ENV, RAILWAY_ENVIRONMENT_NAME), and an explicit environment variable still overrides any value.

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
