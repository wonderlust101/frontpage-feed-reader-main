// Better Auth's browser client. It calls the API directly (NEXT_PUBLIC_API_URL, e.g. https://api.readfrontpage.com,
// which next.config.ts sets for each deployment):
// the site and the API share one domain, so the session cookie the API sets reaches this site's pages too, and the
// client sends it along with every request (credentials: 'include' is Better Auth's default). The address is baked in
// when the app is built. emailOTPClient adds authClient.emailOtp.
// Browser-only ('client-only'): importing it from server code fails the build, as require-user.ts does the reverse.

import 'client-only';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    plugins: [emailOTPClient()],
});
