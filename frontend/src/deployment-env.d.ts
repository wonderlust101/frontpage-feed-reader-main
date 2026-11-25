// next.config.ts always fixes these into the build, so code can read them as plain strings.

declare namespace NodeJS {
    interface ProcessEnv {
        API_URL: string;
        NEXT_PUBLIC_API_URL: string;
        NEXT_PUBLIC_SITE_URL: string;
        AUTH_COOKIE_PREFIX: string;
    }
}
