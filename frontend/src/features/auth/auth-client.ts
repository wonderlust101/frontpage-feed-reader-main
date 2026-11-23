// Better Auth's browser client. It has no baseURL, so in the browser it calls this site's /api/auth, which
// next.config.ts forwards to the API; that keeps the session cookie on this site. emailOTPClient adds authClient.emailOtp.
// Browser-only ('client-only'): importing it from server code fails the build, as require-user.ts does the reverse.

import 'client-only';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
