# Backend work for the auth pages

The frontend auth pages (branch `feat/auth-frontend`, PR #11) were built against the backend as it is. Nothing below was built: these are the backend changes the pages need or would benefit from, in priority order. Each item says why it matters and how to check it's done.

All paths are relative to the repo root. Better Auth is 1.7.26 on both sides.

## 1. Email verification by 6-digit code (needed)

**Why:** `/verify-email` asks for a 6-digit code, but the backend sends no verification email of any kind. A user's `emailVerified` flag always stays `false`, and the page's requests fail with a general error. Signed-in users can choose "Do this later" in the meantime.

**What to add** in `backend/src/modules/auth/auth.service.ts`:

- Better Auth's `emailOTP` plugin (`better-auth/plugins/email-otp`). "OTP" means one-time password, here the 6-digit code.
    - `otpLength: 6`.
    - `sendVerificationOnSignUp: true`: send a code when an account is created.
    - `overrideDefaultEmailVerification: true`: use codes instead of links everywhere.
    - `sendVerificationOTP({ email, otp, type })`: build the email and call the existing `sendEmail` from `backend/src/lib/email.ts`. Without Resend it is printed to the console (`[email] to …`), so local testing works with no email service. Escape any user text with `escapeHtml`.
    - Defaults worth knowing: codes expire after 300 seconds (`expiresIn`), allow 3 wrong tries (`allowedAttempts`), and sends are rate-limited to 3 per minute. The page's "Send a new code" button already waits 60 seconds between sends.
    - The verify page tells readers the code "expires in 5 minutes" (`CODE_LIFETIME_MINUTES` in `frontend/src/features/auth/components/verify-email-form.tsx`). If `expiresIn` is changed from 300 seconds, change that constant too.
- `emailVerification: { autoSignInAfterVerification: true }`: signs the user in once the code is accepted. The page then goes to `/user`; without it, the page goes to `/sign-in?verified=1`.
    - **Why this matters (design critique, 2026-11-22):** without it, a brand-new reader creates an account, confirms their email, and then has to type their email and password again on a sign-in form. That is the weakest moment of the most important journey: it ends on a form instead of inside the app. The frontend softens it for now with a "You're confirmed / Welcome aboard!" heading on `/sign-in?verified=1`, but signing in automatically is the real fix.
    - **Nothing to change on the frontend:** `verify-email-form.tsx` already goes to `/user` whenever the verify response carries a `token` (or the reader is already signed in), so turning this on is backend-only.
    - **Done when:** after entering a correct code as a signed-out new user, the page lands on `/user` signed in, with no sign-in form in between.
- **Decide** whether to set `emailAndPassword.requireEmailVerification: true`. If set, unverified users can't sign in. The sign-in page already handles that case (`EMAIL_NOT_VERIFIED`) with a "Send a code" button.

**What the frontend calls** (through its `/api/auth` proxy):

- `POST /api/auth/email-otp/send-verification-otp` with `{ email, type: 'email-verification' }`
- `POST /api/auth/email-otp/verify-email` with `{ email, otp }`. It returns `{ status, token }`, where `token` is set when auto sign-in is on.

**Done when:**

- Tests in `backend/test/modules/auth/` (PGlite) cover: sign-up creates a code; the right code marks `emailVerified`; a wrong code, an expired code and too many tries each fail with their error code.
- `backend/requests/api.http` has both requests.
- By hand: sign up at `/sign-up`, copy the code from `bun run docker:logs`, enter it, and land on `/user` showing "Email verified."

## 2. Production cookie and link settings (needed before deploying the auth pages)

**Why:** in production the frontend (Vercel) and API (Railway) are different sites. The frontend therefore proxies `/api/auth/*` to the API, so the session cookie belongs to the frontend's site. Two settings still point at Railway:

- `AUTH_URL` is Better Auth's `baseURL`. Links in emails are built from it, so they currently open on the Railway domain. That's harmless for reset links (they only check the token and redirect back to the frontend), but anything that sets a cookie from a link would set it on the wrong site.
- Better Auth only trusts the origins in `WEB_ORIGIN`.

**What to change:**

- On Railway, set `AUTH_URL` to the Vercel site's address (e.g. `https://frontpage.vercel.app`), so emailed links go through the frontend's proxy too.
- Update the comment on `AUTH_URL` in `backend/.env.example` ("password-reset links point here") to say it's the public site that serves `/api/auth`.
- Add Vercel preview addresses to `WEB_ORIGIN` (comma-separated), or previews will get `403 INVALID_ORIGIN`.

**Done when:** on a deployed preview, signing in keeps the user signed in after a refresh, and a reset link from a real email works.

## 3. Missing tests and example requests

**Why:** the frontend relies on these endpoints, and nothing tests them yet.

- **Change password** (`POST /api/auth/change-password` with `{ currentPassword, newPassword, revokeOtherSessions }`):
    - a wrong current password returns `INVALID_PASSWORD`;
    - `revokeOtherSessions` signs other sessions out but keeps this one;
    - a session older than Better Auth's `freshAge` (1 day by default) returns `SESSION_NOT_FRESH`.
- **Reset password POST** (`POST /api/auth/reset-password` with `{ newPassword, token }`).
- **Untrusted return addresses** are rejected: a `redirectTo` on a site not in `WEB_ORIGIN` returns `403 INVALID_REDIRECT_URL`.
- Add each request to `backend/requests/api.http`.

## 4. One shared password rule (small)

**Why:** the minimum (8) and maximum (128) password lengths are written twice: `MIN_PASSWORD_LENGTH` in `backend/src/modules/auth/auth.service.ts` and `frontend/src/features/auth/schemas.ts`. If one changes, the other forgets.

**What to change:** export both from `packages/shared` and import them on both sides. Pass `maxPasswordLength` explicitly in the Better Auth config too (it currently relies on the library default of 128).

## 5. Rate limiting behind the proxy (check)

**Why:** sign-in and sign-up allow 3 tries per 10 seconds per IP address. Behind the Vercel proxy, Better Auth must read the visitor's real IP, not Vercel's, or everyone would share one limit.

**What to check:** on a deployed preview, log the IP Better Auth sees (or test the limit from two networks). If it's Vercel's, set `advanced.ipAddress.ipAddressHeaders` to the header Vercel forwards with the client IP (`x-forwarded-for`, whose first entry is the client).

## 6. Docker parity (small)

`docker-compose.yml` sets no `AUTH_SECRET` for the backend, so Better Auth uses its built-in development secret. Add a fixed local value so local behaves like production.

## 7. Later

- **Guest mode:** an endpoint that serves the starter feeds (`starter_feeds` table) to guests. Not auth, but the `/guest` placeholder is waiting for it.
- **Breached passwords (optional):** Better Auth's `haveibeenpwned` plugin rejects passwords known from data breaches. The frontend shows its error through the generic message unless a code is added to `frontend/src/features/auth/error-messages.ts`.
- **Content Security Policy (frontend):** the frontend sends baseline security headers but no CSP yet. A CSP needs per-request nonces, which conflict with Cache Components' prerendered shell, so it needs its own design.
