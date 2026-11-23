// The deployment's URLs and cookie prefix, which next.config.ts always fixes into the build (from the committed map in
// packages/shared, or a variable that overrides it), so code can read them as plain strings.

declare namespace NodeJS {
    interface ProcessEnv {
        API_URL: string;
        NEXT_PUBLIC_API_URL: string;
        NEXT_PUBLIC_SITE_URL: string;
        AUTH_COOKIE_PREFIX: string;
    }
}
