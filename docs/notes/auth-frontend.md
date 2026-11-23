# Frontend follow-ups for the auth pages

The auth backend is finished (branch `feat/auth-backend`, PR #15): email verification by 6-digit code, emails in Mailpit locally, shared password and code limits, and a production guard for `AUTH_SECRET`. The frontend auth pages (PR #14) were built before that work. The stale parts have been fixed on `feat/auth-frontend`: verifying now always ends on `/user` (the `?verified=1` sign-in fallback is gone), change password asks the reader to sign in again on `UNAUTHORIZED`, and the `EMAIL_NOT_VERIFIED` sign-in path is kept, with a comment, for the day verification becomes required. What's left is work that waits on something else, in priority order. Each item says why it matters and how to check it's done.

All paths are relative to `frontend/src` unless they start with `backend/` or `docs/`. To try anything below locally, run `bun run docker:up` and read emails in Mailpit at `http://localhost:8025` (see the README, "Testing auth emails with Mailpit").

## What the backend does now (so the items below make sense)

- **Sign-up emails a code.** The right code verifies the email **and signs the user in**: `POST /api/auth/email-otp/verify-email` always answers `{ status: true, token }` and sets the session cookie.
- **Verification is optional.** `requireEmailVerification` is off, so unverified users can sign in, and sign-in never answers `EMAIL_NOT_VERIFIED`.
- **Codes:** 6 digits, last 5 minutes, 3 wrong tries, at most 3 sends per minute; a new code replaces the old one. The limits live in `packages/shared/src/auth.ts` (`schemas.ts` re-exports them).
- **Switched off:** sign-in by code, password reset by code and email change by code answer 404. Only `send-verification-otp` and `verify-email` exist.
- **Change password** needs a valid session and the current password. Better Auth 1.7.26 does **not** apply `freshAge` to it, so it never answers `SESSION_NOT_FRESH`; a session that has ended answers `401 UNAUTHORIZED`. If a recent sign-in should be required for password changes, that needs a backend `before` hook on `/change-password`.

## 1. Keep reminding unverified readers

**Why:** verification is optional, so some readers will never confirm their email, and a lost password can then only be recovered if the address is real. The placeholder `/user` page (`app/user/page.tsx`) already says "Email not verified. Verify now", but it will be replaced by the real app.

**What to change:** when the real signed-in layout is built, carry the reminder over (e.g. a dismissible notice linking to `/verify-email`), using `user.emailVerified` from `requireUser`.

**Done when:** an unverified reader sees a way to verify from the main signed-in view, and a verified reader sees nothing.

## 2. Guest page (needs a backend endpoint first)

**Why:** `/guest` (`app/guest/page.tsx`) is a placeholder. Guest mode should show the curated sample feeds (the `starter_feeds` table, seeded from `backend/data/`) without an account.

**What to change:** first add a backend endpoint that serves the starter feeds (a new module under `backend/src/modules/`, its type in `packages/shared/src/api.ts`, a request in `backend/requests/api.http`). Then build the page against it with `lib/api.ts`.

**Done when:** `/guest` shows the sample feeds while signed out.

## 3. Content Security Policy

**Why:** `next.config.ts` sends baseline security headers but no CSP. A CSP limits where scripts can come from, a strong second line of defence against XSS.

**What to change:** a CSP needs per-request nonces, which conflict with the static shell Cache Components prerenders, so it needs its own design. Read the bundled Next.js docs on CSP and Cache Components first, and decide between nonces (dynamic rendering) and a hash-based or `strict-dynamic` policy.

**Done when:** every page sends a CSP header, the app works with it (check the browser console for violations), and the choice is written down in the README.

## 4. Breached-password message (only if the backend adds the check)

**Why:** the backend may later add Better Auth's `haveibeenpwned` plugin, which rejects passwords known from data breaches. Its error would currently show the generic message.

**What to change:** if the plugin is added, map its error code (check the plugin's error codes in `node_modules/better-auth`) in `features/auth/error-messages.ts` to a helpful sentence, e.g. "This password appeared in a data breach. Choose a different one."

**Done when:** signing up with a well-known breached password (e.g. `password123`) shows that sentence.

## 5. An end-to-end test for sign-up and verification (optional)

**Why:** frontend tests cover pure logic only. The sign-up → code → `/user` journey was checked by hand with a headless browser reading the code from Mailpit's API (`GET http://localhost:8025/api/v1/search?query=to:<email>`, then `/api/v1/message/<ID>`), but nothing runs it automatically.

**What to change:** if the project adds browser tests, start with this journey against the Docker stack (never Neon).

**Done when:** one command signs up, reads the code from Mailpit, verifies, and checks it lands on `/user`.

## Deploy checks (frontend side)

Do these on the first deployed preview after PR #12 merges:

- **`API_URL` at build time:** `next.config.ts` reads it when the app is **built** (the `/api/auth` rewrite is fixed then), so it must be set in Vercel's build environment, not only at runtime.
- **Sign-in survives a refresh:** sign in on the preview, refresh, and check you're still signed in (the cookie belongs to the Vercel site through the proxy).
- **Emailed links open on the frontend:** request a password reset; the link should start with the Vercel address. If it starts with the Railway address, `AUTH_URL` on Railway is wrong.
- **Preview origin is trusted:** if auth requests fail with `403 INVALID_ORIGIN`, the preview address is missing from `WEB_ORIGIN` on Railway.
