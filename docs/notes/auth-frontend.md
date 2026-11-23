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

## 3. Breached-password message (only if the backend adds the check)

**Why:** the backend may later add Better Auth's `haveibeenpwned` plugin, which rejects passwords known from data breaches. Its error would currently show the generic message.

**What to change:** if the plugin is added, map its error code (check the plugin's error codes in `node_modules/better-auth`) in `features/auth/error-messages.ts` to a helpful sentence, e.g. "This password appeared in a data breach. Choose a different one."

**Done when:** signing up with a well-known breached password (e.g. `password123`) shows that sentence.

## 4. An end-to-end test for sign-up and verification (optional)

**Why:** frontend tests cover pure logic only. The sign-up → code → `/user` journey was checked by hand with a headless browser reading the code from Mailpit's API (`GET http://localhost:8025/api/v1/search?query=to:<email>`, then `/api/v1/message/<ID>`), but nothing runs it automatically.

**What to change:** if the project adds browser tests, start with this journey against the Docker stack (never Neon).

**Done when:** one command signs up, reads the code from Mailpit, verifies, and checks it lands on `/user`.

## Deploy checks (frontend side)

Do these on staging (`staging.readfrontpage.com`, see the README's Staging section) before production, then again on the first production deploy. `*.vercel.app` previews can't sign in. On staging, read every `api.` and `www.` below as `api.staging.` and `staging.`, and also check that the session cookie is named `frontpage-staging.session_token`.

- **Domains resolve:** `https://www.readfrontpage.com` serves the site (and `readfrontpage.com` redirects to it); `https://api.readfrontpage.com/api/health` answers.
- **`NEXT_PUBLIC_API_URL` at build time:** it is baked into the browser bundle and the CSP, so it must be set in Vercel's build environment. If sign-in calls `localhost:4000`, it wasn't.
- **Sign-in survives a refresh:** sign in, refresh, and check you're still signed in. In the browser's cookies, the session cookie's domain should be `readfrontpage.com`; if it is `api.readfrontpage.com`, `AUTH_COOKIE_DOMAIN` is missing on Railway.
- **Railway sets `X-Real-IP` itself:** temporarily log `x-real-ip` on `/api/auth` and call it with `curl -H 'X-Real-IP: 1.2.3.4' https://api.readfrontpage.com/api/auth/get-session`. Your real IP must arrive, not `1.2.3.4`; otherwise anyone could pick their own rate limit, and the IP needs another source.
- **Limits are per reader:** from two networks (Wi-Fi and a phone on mobile data), three quick wrong passwords on one must not block the other.
- **Emailed links:** request a password reset; the link starts with `https://api.readfrontpage.com` and lands on `https://www.readfrontpage.com/reset-password`.
- **No CSP violations:** open each auth page on the preview with the browser console open. Nothing should say "Refused to … because it violates the following Content Security Policy directive" (Vercel's preview toolbar or analytics may need their origins added).
- **The site's origin is trusted:** if auth requests fail with `403 INVALID_ORIGIN` or a CORS error in the console, `https://www.readfrontpage.com` is missing from `WEB_ORIGIN` on Railway.
