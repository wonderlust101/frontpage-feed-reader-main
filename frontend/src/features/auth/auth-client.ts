// Better Auth's browser client. It calls the API directly; site and API share one domain, so the session cookie the
// API sets reaches this site's pages too. client-only: importing it from server code fails the build.

import 'client-only';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    plugins: [emailOTPClient()],
});
