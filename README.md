# Frontpage

A customizable RSS/Atom feed reader — a [Frontend Mentor](https://www.frontendmentor.io) Product Challenge. The original challenge brief lives in [`docs/challenge-brief.md`](docs/challenge-brief.md).

## Stack

| Part     | Tech                                                              | Hosted on |
| -------- | ----------------------------------------------------------------- | --------- |
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 | Vercel    |
| Backend  | Express 5 · TypeScript · Bun runtime                              | Railway   |
| Database | Neon Postgres · Drizzle ORM                                       | Neon      |

Bun is the package manager and script runner everywhere.

## Project structure

The repo is a **Bun workspace** with four packages: `frontend/`, `backend/`, `packages/shared/` and `packages/eslint-config/`. Each has its own `package.json`, but there is one `bun.lock` and one (hoisted) `node_modules` at the root. Run `bun install` from the root; add a dependency inside the package that needs it (`cd backend && bun add x`).

`packages/shared` (`@frontpage/shared`) holds code both sides use, starting with the API response types. Backend and frontend import it the same way (`import type { HealthResponse } from "@frontpage/shared"`), so the API contract is defined once.

```
.
├── packages/
│   ├── shared/               # @frontpage/shared: code used by both sides
│   │   └── src/api.ts        #   API response types (the backend ↔ frontend contract)
│   └── eslint-config/        # @frontpage/eslint-config: the ESLint Stylistic code style every package lints with
├── frontend/                 # Next.js → Vercel (Root Directory: frontend)
│   ├── vercel.json
│   ├── .env.example
│   ├── test/                 # bun:test tests mirroring src/ (pure logic: schemas, redirect guard, error messages)
│   └── src/
│       ├── proxy.ts          # sends signed-out visitors from /user and /account to sign-in
│       ├── app/              # routes, layout, globals.css; route-private code in _components/ _data/ _assets/
│       │   ├── (auth)/       #   sign-in, sign-up, verify-email, forgot/reset-password, account/password
│       │   └── design-system/  # /design-system: the living design system page
│       ├── features/         # app features, mirroring backend/src/modules (auth, categories, items, preferences…)
│       │   └── <domain>/     #   components/, hooks/ (use-*.ts), logic at the root (fields.ts, schemas.ts…)
│       ├── components/       # shared, feature-agnostic: ui/ primitives (incl. form pieces), logo.tsx, app-shell/ (rail, category panel, toolbar with search, drawer), stickers.tsx
│       ├── lib/api.ts        # server-side client for the backend
│       └── styles/           # tokens.css (design tokens), components.css (component layer)
├── backend/                  # Express → Railway (built from the repo root)
│   ├── .env.example
│   ├── drizzle.config.ts
│   ├── neon.ts               # Neon infrastructure-as-code (linked via .neon)
│   ├── bunfig.toml           # bun test config (preloads test/setup.ts)
│   ├── data/                 # sample feeds (JSON + OPML) for the guest experience
│   ├── test/                 # bun:test tests mirroring src/ (see backend/test/README.md)
│   ├── requests/             # .http files for manual API requests
│   └── src/
│       ├── index.ts          # starts the server (PORT, graceful shutdown)
│       ├── app.ts            # Express app: global middleware + mounts module routers
│       ├── middleware/       # shared by all modules: error handling, the auth guard and rate limits
│       │   ├── error-handler.ts      # errorHandler: every thrown error → the standard JSON error body
│       │   ├── not-found-handler.ts  # notFoundHandler: unknown routes → 404
│       │   ├── require-auth.ts       # requireAuth: 401 without a session; currentUser(res) in controllers
│       │   └── rate-limit.ts         # perUserRateLimit: 429 + X-Retry-After past N requests per signed-in user
│       ├── errors/           # one file per error class, thrown by services and lib: HttpError + BadRequestError (400) … GatewayTimeoutError (504)
│       ├── env.ts            # typed environment variables
│       ├── modules/          # one folder per feature; each owns its routes, logic and tables
│       │   ├── auth/         #   /api/auth/* (Better Auth) + "users", "sessions", "accounts", "verifications" tables
│       │   ├── health/       #   GET /api/health (routes → controller)
│       │   ├── feeds/        #   GET /api/fetch (routes → controller → service), ingestion (feeds.ingest.ts) + "feeds", "starter_feeds" tables
│       │   ├── items/        #   /api/items (routes → controller → validation + cursor → service; read rule) + "items", "item_read_states" tables
│       │   ├── categories/   #   "categories" table + the "is this category yours?" check
│       │   ├── subscriptions/#   /api/subscriptions (routes → controller → validation → service; health rule) + "subscriptions" table
│       │   ├── preferences/  #   "user_preferences" table
│       │   └── bookmarks/    #   "bookmarks" table
│       ├── db/               # Drizzle client (index.ts) + schema registry (schema.ts re-exports every module's tables)
│       ├── lib/              # framework-free helpers used across modules (feed fetching/parsing, email…)
│       ├── types/            # backend-only types shared across modules (create when needed; API types go in packages/shared)
│       └── scripts/          # one-off scripts run with `bun src/scripts/<name>.ts` (e.g. seeding)
├── docs/                     # notes/: design records (tracked; planned work is in Jira); spec, guidance, brief (local, git-ignored)
├── package.json              # workspace definition + root scripts
├── bun.lock · bunfig.toml    # single lockfile; hoisted node_modules
├── AGENTS.md / CLAUDE.md     # AI collaboration context
└── .gitignore · .cursorignore · .aiignore
```

### Backend modules

Each feature lives in `backend/src/modules/<feature>/`, with files named after the feature:

| File                      | Holds                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `<feature>.routes.ts`     | Express `Router`, mounted in `app.ts` (`app.use("/api/<feature>", router)`). Only maps URL + method → controller      |
| `<feature>.controller.ts` | HTTP in/out: reads `req` (query, params, headers, body), calls the service, sets status/headers. Never catches errors |
| `<feature>.validation.ts` | Checks ids and bodies and returns the shared request types (`unknown` in, typed out); throws 400 or 404               |
| `<feature>.service.ts`    | Business logic and database queries; controllers call this. Never touches `req`/`res`                                 |
| `<feature>.schema.ts`     | Drizzle table definitions; **also export it from `src/db/schema.ts`** so drizzle-kit and the db client see it         |
| `<feature>.types.ts`      | Types used only inside this module                                                                                    |

Requests flow **routes → controller → service**: keep handler bodies out of routes files and HTTP details out of services, so services stay reusable (e.g. by background jobs) and testable without Express. Only create the files a module needs: `health/` has routes + controller; `feeds/` has routes, controller, service, types and its tables, plus `feeds.ingest.ts`, a second service that stores fetched feeds; `subscriptions/` has routes, controller, validation, service and its table, plus `subscriptions.health.ts`, the pure feed-health rule. A module may split out a file like this when one file would hold two unrelated jobs.

**Errors.** Every API error has the same shape, whatever the status:

```json
{ "error": { "code": "not_found", "message": "Feed not found", "retryable": false } }
```

- Services **throw** the class for the status they mean, from `src/errors/`: `BadRequestError` (400), `UnauthorizedError` (401), `NotFoundError` (404), `ConflictError` (409), `PayloadTooLargeError` (413), `UnprocessableEntityError` (422), `TooManyRequestsError` (429), `BadGatewayError` (502), `ServiceUnavailableError` (503), `GatewayTimeoutError` (504), e.g. `throw new NotFoundError('not_found', 'Feed not found')`. 5xx, 408 and 429 are retryable unless you pass `{ retryable: false }`.
- Controllers **don't catch**. Express 5 forwards thrown errors to `src/middleware/error-handler.ts`, the only place error JSON is built. Unknown errors become a logged, generic 500.
- A new kind of error needs no registration: throw the right class with a new code, and add the code to `ApiErrorCode` in `packages/shared/src/api.ts` so the frontend knows it. A new status is a small file in `src/errors/` (copy one of the others) plus a line in its `index.ts`.

The sample feeds live in `backend/data/` because only the backend reads them.

### Code style

ESLint formats TypeScript (`.ts`, `.tsx`, `.mjs`) with ESLint Stylistic (`packages/eslint-config`); Prettier formats everything else (CSS, JSON, Markdown, YAML). `bun run format` runs both, and `bun run lint` fails on any layout the formatter would change. Prettier skips TS files because it would pull a brace-free `if` body up onto the `if` line.

**Layout:**

- Braces are optional for a single statement. Without braces, the body goes on the next line, indented. Use braces for several statements, every branch of an `if`/`else` chain, and wherever leaving them out reads worse.
- A blank line separates steps: after imports and groups of declarations, around `if`/`for`/`while`/`switch`/`try`, and before `return` (the linter enforces these). Inside a component, group the hooks, the derived values, the handlers and the JSX, and leave a blank line between large JSX sections.
- Prefer early returns to nesting, and `if`/`else` to nested ternaries.

<!-- prettier-ignore -->
```ts
if (!user)
    return null;

for (const item of items)
    processItem(item);
```

**File order, top to bottom:**

1. Purpose comment (0–2 `//` lines, 3 at most), then a blank line
2. Imports
3. Types
4. Constants, then module state (`let` variables, caches)
5. Exported functions, the file's main one first
6. Private helpers, in the order the functions above call them

You meet a file's main function first and read down into the details. Write helpers as `function` declarations, not `const helper = () => …`: functions are hoisted, so a constant near the top (like `const ISO = pattern(…)` in `dates.ts`) can use a helper defined further down. Test files are the exception: their setup and helpers go above the tests.

**Comments** (`//` only, never `/* */` or `/** */`). Fewer is better: a comment says _why_, not _what_.

- **Top of file:** optional, 0–2 lines (3 at most) on the file's purpose or a key design decision. Don't add one just to restate the file name.
- **Functions:** none when the name and body explain it. Otherwise exactly one line on what a caller can't see (why it exists, when it returns null, what it throws).
- **Inside code:** a one-line _why_ next to the line it explains (a regex, a workaround, non-obvious library or browser behaviour, an accessibility decision). No section dividers and no narration.
- **Tables:** one line above each `pgTable(...)` saying what the table is for (two for complex tables).
- **Names first:** if code needs a comment to be understood, rename the variable or extract a named constant instead (`MAX_OFFSET_HOURS = 14`, not `14 // max offset`).
- Roadmap notes and to-dos go in Jira, not in comments.

**Editor setup:** run ESLint's fix on save for TS and restrict Prettier to the other files. WebStorm: Settings → Prettier → "Run for files" `**/*.{css,json,md,yml,yaml,html}`, and Settings → ESLint → "Run eslint --fix on save". VS Code: `"editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }`, with Prettier as the formatter only for those file types.

## Planning and tracking

Planned work, bugs and open decisions live in Jira, project **KAN** ([open the project](https://sergeiborja.atlassian.net/browse/KAN)), not in Markdown. Each epic follows a part of the challenge spec; dependencies are "blocks" links. Bugs are Tasks labelled `bug`; work waiting on a product choice is labelled `decision-needed`. Name branches after the issue (e.g. `feat/KAN-7-reading-experience`) so Jira links them.

`docs/notes/` keeps only lasting design records (the app shell's design brief and its architecture decisions), not to-do lists.

**Definition of done**, for every issue:

- Looks right at 1440, 1024, 390 and 320px wide, in light and dark mode, with no horizontal scroll.
- Works with the keyboard alone, with a visible focus ring; one `h1` per page.
- `bun run format:check && bun run typecheck && bun run lint && bun run test` pass, and `bun run --cwd frontend build` succeeds.
- A new endpoint has a route test (`startTestServer()`), its type in `packages/shared/src/api.ts` and a request in `backend/requests/api.http`.
- Tests and manual checks run against local resources only, never Neon (see "Testing the API locally").

## Getting started

```bash
bun install                                  # installs every workspace package from the root
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
bun dev                                      # backend :4000 + frontend :3000 in parallel
```

Open http://localhost:3000. The page shows the API and database status.

### Running everything in Docker

`docker-compose.yml` runs the whole stack locally with hot reload: a **local Postgres 17** container (not Neon), the API (`bun --watch`), and the frontend (`next dev`). `backend/`, `frontend/` and `packages/` are bind-mounted into the containers, so edits on your machine reload immediately. Images build from the repo root so they can see the workspace lockfile and `packages/shared`.

```bash
bun run docker:up                   # build + start (also refreshes container node_modules)
bun run docker:logs                 # follow logs
bun run docker:down                 # stop (docker compose down -v also wipes the database)
docker compose run --rm migrate     # re-sync the Drizzle schema after editing *.schema.ts
```

| Service    | URL                                                       | Notes                                                                   |
| ---------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `frontend` | http://localhost:3000                                     | `next dev`; calls the API at `http://backend:4000`                      |
| `backend`  | http://localhost:4000                                     | `bun --watch`                                                           |
| `db`       | `postgres://frontpage:frontpage@localhost:5432/frontpage` | Data persists in the `frontpage_db-data` volume                         |
| `mailpit`  | http://localhost:8025                                     | Local test inbox: every email the API sends lands here                  |
| `migrate`  | —                                                         | One-shot `drizzle-kit push` that syncs the schema before the API starts |

- **Dependencies:** `node_modules` lives inside the containers, not on the bind mount. After `bun add`, run `bun run docker:up` again to reinstall.
- **Neon stays untouched:** because of the bind mount, `backend/.env` is visible in the containers. Bun runs with `--no-env-file`, and compose sets every database variable explicitly, so the stack only talks to the local Postgres. Keep it that way if you edit `docker-compose.yml`.
- **File names:** the images are built from `backend/Dockerfile.local` and `frontend/Dockerfile.local`. They're named `.local` so Railway keeps building the backend with Railpack instead of picking up a `Dockerfile`.
- **Testing on other devices:** open `http://<your machine's LAN IP>:3000` on a phone or another computer on the same network (`ip -4 addr` shows the IP). `allowedDevOrigins` in `frontend/next.config.ts` lets `192.168.*.*` load the dev scripts; without it the page renders but isn't interactive. It affects `next dev` only. Sign-in calls the API from the browser, so for auth on another device also set `NEXT_PUBLIC_API_URL=http://<LAN IP>:4000` for the frontend and add `http://<LAN IP>:3000` to the backend's `WEB_ORIGIN`.
- **Stale CSS:** file-change events from the bind mount occasionally don't reach the frontend container, so a CSS edit doesn't show up. `docker restart frontpage-frontend-1` picks it up.

## Design system

The living reference is **`/design-system`** (`frontend/src/app/design-system/`): every token and component, working, in both themes. Tokens are in `frontend/src/styles/tokens.css`, component CSS in `components.css`, and Tailwind's theme mapping plus the type-role, `rule-t`/`rule-b` and focus rules in `src/app/globals.css`.

Decisions worth knowing before changing it:

- **Type leads, color maps.** Bricolage Grotesque for anything scanned, Onest for reading. Color has one job: Lemon (`#ffd000`, the same in both themes) is Frontpage's own, and seven vivid fields (Coral, Sky, Leaf, Lilac, Tangerine, Aqua, Rose) mark categories. Ink text on every field is 7.5:1 or better. No shadows, no gradients.
- **Category colors are the reader's choice.** Any category can take any field, several can share one, and a new category starts on **No color**, a neutral stone field that behaves exactly like the others. Guests' choices are kept in `localStorage` (`frontpage-category-fields`, via `useCategoryFields` in `features/categories/hooks/use-category-fields.ts`); signed-in users will need a color column on `categories`.
- **Every color is written once** with `light-dark()`; the theme switch only sets `color-scheme`. Fields keep their full color in dark mode.
- **Accessibility is designed in, not bolted on.** Two-tone focus rings (ink outline over a ground halo) that show on any field, while text inputs thicken their own edge instead; a high-contrast tier (system `prefers-contrast` or the reader settings) that raises supporting text to 7:1 and thickens rules; forced-colors fallbacks; 44px hit areas on small controls; state never shown by color alone (check marks, line styles, labels).
- **Readers tune the column.** Text size, line height, reading width, density, typeface, theme and contrast are reader settings (on `/design-system` for now; their home in the app comes later). They are saved in `localStorage` and copied onto `<html>` as data attributes before the first paint (one list in `src/lib/saved-preferences.ts`), and `tokens.css` maps them to CSS custom properties.
- **The app shell is sidebar first.** A rail, a collapsible category panel and the workspace, three neutral steps lighter toward what you read; the selected category's color shows in its row, the toolbar tag and the title. Search is a Ctrl/Cmd + K palette. See `docs/notes/app-shell-design.md` and `app-shell-architecture.md`.
- **Quiet, consistent edges.** 1.5px ink for controls and the rule that opens a list; a 1px `fill-edge` hairline (ink at 40%) inside small color fills so pale fields keep an edge; hover never changes an element's size.

## Auth

Accounts use [Better Auth](https://www.better-auth.com) on the backend (`backend/src/modules/auth/`) and its React client on the frontend (`frontend/src/features/auth/`).

| Route                  | What it does                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/sign-in`             | Email and password. `?next=` (same-site paths only) says where to go after; `?reset=1` greets a reader back from a password reset and fills in their email                                                               |
| `/sign-up`             | Name, email and password, then `/verify-email`                                                                                                                                                                           |
| `/verify-email`        | The 6-digit code from the email (it asks for the address first when no code was sent yet); the right code signs the reader in and opens `/user`; signed-in readers can do it later                                       |
| `/forgot-password`     | Emails a reset link; always answers the same, so it never reveals who has an account                                                                                                                                     |
| `/reset-password`      | Opened from the link: choose a new password (the API then signs every session out)                                                                                                                                       |
| `/account/password`    | Signed in: change the password, optionally signing out other devices                                                                                                                                                     |
| `/`                    | Placeholder marketing page with the three ways in (sign in, sign up, guest)                                                                                                                                              |
| `/guest`, `/guest/c/…` | Guest mode inside the app shell (rail, category panel, search) with a page per curated category; the article lists are placeholders until the guest catalogue endpoint (KAN-34) and the article list pages (KAN-30) land |
| `/user`                | The signed-in home inside the app shell; placeholder content until the article list pages (KAN-30) use `/api/items`                                                                                                      |

Decisions worth knowing:

- **The browser calls the API directly, on a shared domain.** The site is `https://www.readfrontpage.com` (Vercel) and the API `https://api.readfrontpage.com` (Railway). Being subdomains of one site, they can share the session cookie: the API sets it for all of `readfrontpage.com` (`AUTH_COOKIE_DOMAIN`), so `src/proxy.ts` and `requireUser` on the site see it. `authClient` calls `NEXT_PUBLIC_API_URL` with credentials; CORS allows `WEB_ORIGIN`, caches preflights for 2 hours and exposes `X-Retry-After` (the wait shown after too many tries). Locally, `localhost:3000` and `:4000` already share cookies, since cookies ignore the port. With no proxy in between, Railway's edge sees each reader, so Better Auth reads their IP from `X-Real-IP` and every reader gets their own rate limits. Session checks (`/get-session`) are never rate-limited: signed-in pages make them from Vercel's servers, which share a few IPs.
- **A Content Security Policy guards every page outside development.** `next.config.ts` sends it with the other security headers. Everything the app loads is on its own site, and the browser calls only one other origin, the API, so the policy allows `'self'` plus the API origin for requests (`connect-src`): scripts from other sites, requests to any other site, forms posting elsewhere, a planted `<base>` tag and framing are all blocked. It is a fixed header rather than per-request nonces, because nonces need every page rendered on each request, which would switch off the static shells Cache Components prerenders. Those shells carry inline Next scripts, so `script-src` keeps `'unsafe-inline'`, and `style-src` does too for React's `style={…}` attributes. The dev server (`next dev`) sends no policy at all, so dev tools and scripts injected while working (such as the design detector's overlay) can load; every build sends it. It never allows eval, so Zod runs `jitless` (`features/auth/schemas.ts`). A new third-party script, font, image host or API origin must be added to the policy, or the browser blocks it.
- **Two checks guard signed-in pages.** `src/proxy.ts` only looks for the session cookie, so signed-out visitors never see the page flash; `requireUser` (`features/auth/require-user.ts`) asks the API whether the session is valid, inside `<Suspense>` as Cache Components requires. If the API can't answer, the page shows its `error.tsx` (a temporary placeholder) instead of treating the reader as signed out.
- **Forms** use React Hook Form with the Zod schemas in `features/auth/schemas.ts`; `error-messages.ts` turns Better Auth's error codes into one sentence each. Every form clears the password after a failure; it is never put back. Every form also has `method="post"`: before React takes over (a slow connection, a script that failed to load), the browser submits the form itself, and without it that would put the password in the URL, and from there in history and server logs.
- **Email verification is by 6-digit code, and optional.** Sign-up emails a code (Better Auth's email-OTP plugin, codes stored hashed, 5 minutes, 3 tries); the right code verifies the email and signs the reader in. Unverified readers can still sign in ("Do this later"). The plugin's other code flows (sign-in, password reset and email change by code) are switched off. Password and code limits live once in `packages/shared/src/auth.ts`.

### Testing auth emails with Mailpit

Without `RESEND_API_KEY`, nothing reaches a real inbox. Outside production the backend sends every email to **Mailpit**, a local test inbox, when `MAILPIT_URL` is set (Docker sets it); otherwise it prints the email to its console. Production never uses Mailpit.

1. `bun run docker:up`, then open `http://localhost:3000/sign-up` and create an account.
2. Open Mailpit at `http://localhost:8025`, copy the 6-digit code, and enter it: you land on `/user`, signed in and verified.
3. For a password reset, use `http://localhost:3000/forgot-password`, open the link from Mailpit (it lands on `/reset-password`), and set a new password. Opening the same link again shows the expired state.

Running with `bun dev` instead of Docker: start only Mailpit with `docker compose up -d mailpit`, and set `MAILPIT_URL=http://localhost:8025` in `backend/.env` (the local URLs come from `deployments.ts`). Reset links open on the API, which sends the reader on to `http://localhost:3000/reset-password`.

## Feed ingestion

`ingestFeed(db, url)` (`backend/src/modules/feeds/feeds.ingest.ts`) fetches one feed and stores it: one `feeds` row per URL, one `items` row per `(feed_id, guid)`. The scheduler, subscribing and manual retry all go through it; `GET /api/fetch` stays a preview that stores nothing.

- **Only changes are written.** Before writing, it reads the stored `content_hash` of the fetched items (a SHA-256 of every stored field) and sends only new or edited items, in one `INSERT … ON CONFLICT`. An unchanged feed sends no item rows, so the database isn't asked to rewrite up to 500 articles and their search index on every fetch. An edited article keeps its `id` and `first_seen_at`, so it never looks new again; articles that drop out of the feed are kept.
- **The fetch runs outside the transaction**, so a slow feed never holds one open. Every database write of one ingest runs in a single transaction.
- **Fetch bookkeeping:** every fetch sets `last_fetched_at`. A success (a 304 counts) sets `last_success_at`, resets `consecutive_failures` and clears the last error. A failure records the error code, message and upstream status and adds one to `consecutive_failures`, as a single atomic update. A URL we don't store yet whose first fetch fails stores nothing: the caller gets the error.
- **Permanent redirects** (301 or 308 on every hop) move `feeds.url`. If another feed already has the new URL, the two are merged: items, subscriptions, bookmarks, read states and the starter-feed entry move onto that feed (its own copy wins where both have one), and the old row is deleted.
- **Trying it by hand:** `docker compose run --rm --no-deps backend bun run ingest:feed <url>` ingests one feed into the local Docker database and prints what changed. The script refuses any database host but `localhost` or `db`, so it can't write to Neon.

## Items API

`backend/src/modules/items/` serves a signed-in reader's articles: a page of a list, the sidebar counts, and one article for the reader view.

- **Pages use a cursor, not an offset.** Each page ends with `nextCursor`, which marks where it stopped (its last item's sort time and id). The next page asks for "the items after this one", so page 50 costs the same as page 1, and marking items read while scrolling never skips or repeats one. `nextCursor` is null exactly when there is nothing more.
- **No query sorts all of a reader's articles.** For each followed feed, a `LATERAL` subquery reads only that feed's next page from the `items_feed_id_sort_at_idx` index; the outer query keeps the best page of those. A reader with 100 feeds reads at most 100 × (page size + 1) rows.
- **The cursor keeps microseconds.** Postgres stores times to the microsecond and a JS `Date` only to the millisecond, so the cursor's time is read from Postgres as text and sent back as text. Rounding it would skip items that share a millisecond.
- **One read rule.** An item is read if the reader marked it, either way; otherwise if it was first seen before their subscription's `read_cutoff` ("mark all as read"). Lists, counts and the single item all use the same SQL fragment (`IS_READ` in `items.service.ts`), so the unread numbers always match the unread lists.
- **Only the reader's data.** Every query starts from the reader's own subscriptions, so another reader's feeds, categories and read marks never appear. A feed, category or article that isn't theirs gets the same 404 as one that doesn't exist. Because rows only come from their subscriptions, a non-empty page already proves a feed or category filter is theirs: only an empty page runs the extra ownership check.
- **Opening an article doesn't mark it read.** Marking read and unread is a separate API.

## Scripts (repo root)

| Command                                                        | What it runs                                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `bun dev`                                                      | Both dev servers in parallel                                                |
| `bun run dev:frontend` / `dev:backend`                         | One dev server                                                              |
| `bun run build`                                                | Production build of the frontend                                            |
| `bun run build:backend`                                        | Type-check the backend (Railway's build step; the backend runs from source) |
| `bun run start:frontend` / `start:backend`                     | Production servers                                                          |
| `bun run typecheck`                                            | Type-check both projects                                                    |
| `bun run test`                                                 | Backend and frontend tests (`bun test` in each)                             |
| `bun run test:watch`                                           | Backend tests, re-run on save                                               |
| `bun run lint`                                                 | Lint frontend, backend and shared (ESLint, including code layout)           |
| `bun run format`                                               | Format everything: Prettier (CSS, JSON, Markdown…) then `eslint --fix` (TS) |
| `bun run db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle Kit (backend)                                                       |
| `bun run docker:up` / `docker:down` / `docker:logs`            | Local Docker stack (see above)                                              |

You can also `cd frontend` or `cd backend` and use their own scripts directly. To add a dependency, run `bun add <pkg>` **inside** the folder that needs it.

## Testing the API locally

### Automated tests

```bash
bun run test            # from the repo root (or `bun test` inside backend/)
bun run test:watch      # re-run on save
bun run test:live       # opt-in: hit the real curated feeds over the network
bun run fixtures:feeds  # re-download the curated feed snapshots used by the tests
```

- Tests live in `backend/test/` and use Bun's built-in runner (`bun:test`). No extra dependencies. The folder mirrors `backend/src/` (the test for `src/x/y.ts` is `test/x/y.test.ts`). See [`backend/test/README.md`](backend/test/README.md) for the layout rules, which `test/structure.test.ts` enforces in CI.
- `startTestServer()` (`backend/test/helpers/test-server.ts`) starts the real Express app on a random free port, so tests call it with plain `fetch`. You don't need `bun dev` running.
- Frontend tests live in `frontend/test/` (also `bun:test`, mirroring `frontend/src/`) and cover pure logic: the auth form schemas, the post-sign-in redirect guard, the error messages, the auth request wrapper, the email hand-off storage and the sign-in greeting. `bun run test` runs both suites.
- Database tests use `createTestDb()` (`backend/test/helpers/test-db.ts`): an in-memory Postgres (PGlite) built from the committed migrations, so they need no database server. `startFeedServer()` (`backend/test/helpers/feed-server.ts`) is a local fake feed server for fetch and ingestion tests; `serve(path, body)` changes what a path returns between fetches.
- `backend/test/setup.ts` runs before every test file (via `backend/bunfig.toml`). It blanks `DATABASE_URL` and pins `WEB_ORIGIN`, so tests behave the same on every machine and never touch your real Neon database, even though `bun test` auto-loads `backend/.env`.

Template for a new endpoint test, e.g. `backend/test/modules/feeds/feeds.routes.test.ts`:

```ts
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { startTestServer } from '../../helpers/test-server';

let server: Awaited<ReturnType<typeof startTestServer>>;
beforeAll(async () => {
    server = await startTestServer();
});
afterAll(async () => {
    await server.close();
});

test('GET /api/feeds returns a list', async () => {
    const res = await fetch(`${server.url}/api/feeds`);
    expect(res.status).toBe(200);
});
```

### Manual requests

`backend/requests/api.http` holds ready-made requests. Start the backend (`bun run dev:backend`), then:

- **JetBrains IDEs:** open the file, click ▶ next to a request, and choose the `local` or `railway` environment.
- **VS Code:** install the _REST Client_ extension, then click **Send Request**.
- **Terminal:** `curl -i http://localhost:4000/api/health`

Environments (base URLs) are in `backend/requests/http-client.env.json`. Update the `railway` URL once you have a domain. Tokens and other secrets go in `http-client.private.env.json` next to it, which is git-ignored.

## Environment variables

Each project has an `.env.example` (committed) documenting every variable, and a local copy that git ignores:

| Project  | Local file            | Production                                              |
| -------- | --------------------- | ------------------------------------------------------- |
| Backend  | `backend/.env`        | Railway → backend service → **Variables**               |
| Frontend | `frontend/.env.local` | Vercel → Project → **Settings → Environment Variables** |

**Deployment URLs are not variables.** The site and API address, the allowed origin, and the session cookie's domain and prefix for production, staging and local live in one committed map, `packages/shared/src/deployments.ts`. Each side picks its row from what its platform already says:

- the frontend (`next.config.ts`, at build time) from Vercel's `VERCEL_ENV`: production, or staging for every preview,
- the backend (`backend/src/env.ts`) from Railway's `RAILWAY_ENVIRONMENT_NAME`: `production` or `staging`.

Anywhere else, Docker and `bun dev` included, gets the local row. A variable that is set still overrides its value. An unknown Vercel or Railway environment stops the build or start rather than falling back to localhost. The dashboards hold only secrets:

- **Backend:** Neon (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`), `AUTH_SECRET`, email (`RESEND_API_KEY`, `EMAIL_FROM`; local-only `MAILPIT_URL`), `NODE_ENV=production`, and optional feed tuning (`FEED_*`). Read through `backend/src/env.ts`.
- **Frontend:** nothing. `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` and `AUTH_COOKIE_PREFIX` are optional local overrides (`frontend/.env.example`).

Generate production secrets with `openssl rand -base64 32`, and don't reuse your local ones.

### Neon (database)

`backend/` is linked to the Neon project **Frontpage Feed Reader** (`long-mode-29061688`), branch `production`:

- `backend/.neon`: org/project/branch the CLI is linked to (git-ignored by `backend/.gitignore`)
- `backend/neon.ts`: Neon infrastructure-as-code (Postgres only for now; new non-default branches auto-expire after 7 days)
- `backend/.env`: `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), `NEON_BRANCH`, `NEON_BRANCH_ID` and `NEON_FUNCTION_HOST_SUFFIX`, written by the CLI

Common commands (run inside `backend/`):

```bash
bunx neon@latest deploy                    # apply neon.ts and re-pull env into .env
bunx neon@latest env pull                  # refresh .env from the linked branch
bunx neon@latest checkout dev --create     # work on a throwaway dev branch (switches .env to it)
```

The backend connects with **node-postgres** (`pg`): one shared pool over the pooled `DATABASE_URL`, reused across requests, because the backend is a long-running server. Drizzle Kit migrations use the direct `DATABASE_URL_UNPOOLED`. Push the schema with `bun run db:push` (or `db:generate` + `db:migrate`).

Without `DATABASE_URL` the backend still runs, and `/api/health` reports the database as `skipped`. When the database fails, it reports `error` and the details go only to the server log, since the endpoint is public.

## Deploying

Deploy the **backend first**, because the frontend needs its URL.

### Backend → Railway

1. Railway → **New Project → Deploy from GitHub repo** → pick this repo.
2. In the service's **Settings**:

    | Setting            | Value                                                                       | Why                                                                                                                 |
    | ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
    | Root Directory     | _(empty: repo root)_                                                        | The backend needs `packages/shared` and the root `bun.lock`                                                         |
    | Build Command      | `bun run build:backend`                                                     | Typechecks the backend. Without it Railpack would run the root `build`, which builds the frontend                   |
    | Start Command      | `bun run start:backend`                                                     | Runs `bun src/index.ts` inside `backend/`                                                                           |
    | Watch Paths        | `/backend/**`, `/packages/**`, `/package.json`, `/bun.lock`, `/bunfig.toml` | Frontend-only commits don't redeploy the backend                                                                    |
    | Healthcheck Path   | `/api/health`                                                               | Railway waits for this before switching traffic                                                                     |
    | Pre-deploy Command | `bun run db:migrate`                                                        | _Only once `DATABASE_URL` is set and you use migration files_                                                       |
    | Networking         | **Custom Domain** `api.readfrontpage.com`                                   | Add the CNAME Railway shows at your DNS provider (on Cloudflare, "DNS only": another proxy would hide readers' IPs) |

    Railpack detects Bun from `packageManager` in the root `package.json` and installs the whole workspace. Railway injects `PORT`.

3. **Variables:** only `NODE_ENV=production`, `AUTH_SECRET`, the database URLs and the email settings. The URLs come from the environment's row in `deployments.ts`; Railway's environment must be named `production` (or `staging`). Don't set `WEB_ORIGIN`, `AUTH_URL`, `AUTH_COOKIE_DOMAIN` or `AUTH_COOKIE_PREFIX` unless you mean to override the map; a stale one wins over it. The API refuses to start in production without `AUTH_SECRET` and a resolved `AUTH_URL`, `WEB_ORIGIN` and `AUTH_COOKIE_DOMAIN`.

### Frontend → Vercel

1. Vercel → **Add New → Project** → import this repo.
2. Set **Root Directory** to `frontend`, and keep **Include files outside the root directory in the Build Step** enabled (Settings → Build and Deployment), so the build can see `packages/shared` and the root `bun.lock`. Next.js is detected; `frontend/vercel.json` pins the Bun install and build commands. `bun install` run inside `frontend/` installs from the workspace root.
3. **Domains** (Settings → Domains): add `www.readfrontpage.com`, and `readfrontpage.com` redirecting to it, so the site has one origin.
4. **Environment Variables:** none needed. `next.config.ts` reads `VERCEL_ENV` at build time and fixes the production or staging URLs into the build (the browser bundle and the CSP's `connect-src`). Keep **Automatically expose System Environment Variables** on (the default), and remove any old `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` or `AUTH_COOKIE_PREFIX`, since a set variable overrides the map.

To skip Vercel builds for backend-only commits, add an `ignoreCommand` to `frontend/vercel.json` that also watches the shared code: `git diff --quiet HEAD^ HEAD -- . ../packages ../package.json ../bun.lock`.

### Staging (auth on a preview)

Sign-in doesn't work on `*.vercel.app` preview addresses: they aren't on `readfrontpage.com`, so the browser drops the API's cookie. Ordinary previews are still fine for layout and signed-out pages. To test auth before production, merge into a `staging` branch, which deploys a full pair on the domain:

|                                                | Production                                             | Staging                                                                         |
| ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Site (Vercel)                                  | `www.readfrontpage.com`                                | `staging.readfrontpage.com` (Settings → Domains, Git branch `staging`)          |
| API (Railway)                                  | `api.readfrontpage.com`                                | `api.staging.readfrontpage.com` (a staging environment on the `staging` branch) |
| URLs, allowed origin, cookie domain and prefix | the `production` row of `deployments.ts`               | the `staging` row (picked automatically; nothing to set)                        |
| Railway environment name                       | `production`                                           | `staging`                                                                       |
| Railway variables                              | `NODE_ENV=production`, its own secret, database, email | `NODE_ENV=production`, a different secret, a Neon staging branch, email         |
| Vercel variables                               | none                                                   | none (every preview, `staging` included, builds with the staging row)           |
| Vercel Deployment Protection                   | n/a                                                    | turn **Vercel Authentication** off for previews, or only your team can open it  |

Keep `NODE_ENV=production` on staging so it enforces the same startup checks and full rate limits. The API sits under `staging.` so its cookie covers only the staging hosts. The cookie prefix is needed because production's cookie, set for all of `readfrontpage.com`, also reaches `staging.`.

**Cloudflare DNS:** CNAMEs for `staging` (to Vercel) and `api.staging` (to Railway), plus the production `www`, root and `api` records, all **DNS only** (grey cloud). A proxied API record would put Cloudflare's IP in `X-Real-IP` and share one rate limit among everyone, and Cloudflare's free certificate doesn't cover proxied two-level names like `api.staging`.

## Ignore files

| File                    | Read by                        | Purpose                                                                                                                                                            |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.gitignore`            | Git                            | Dependencies, builds, env files and secrets, IDE files, local AI settings, challenge reference docs                                                                |
| `.claude/settings.json` | Claude Code                    | Local, not committed (`.claude/` is git-ignored): `permissions.deny` stops Claude from reading env files and secrets, or printing them via the Vercel/Railway CLIs |
| `.cursorignore`         | Cursor                         | Hides secrets and generated noise from indexing and AI                                                                                                             |
| `.aiignore`             | JetBrains AI Assistant / Junie | Same list as `.cursorignore`                                                                                                                                       |

The AI ignore lists deliberately **don't** hide `docs/`, `AGENTS.md` or `CLAUDE.md`. Git ignores those, but AI tools need them. GitHub Copilot has no ignore file: configure content exclusion in the repository's GitHub settings.

## API

Example requests for every route are in [`backend/requests/api.http`](backend/requests/api.http).

| Method | Path                     | Description                                                                                                                                                                                                    |
| ------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health`            | `{ api: "ok", database: "connected" \| "skipped" \| "error" }`                                                                                                                                                 |
| GET    | `/api/fetch`             | `?url=` fetches and normalizes one feed (`FetchFeedResponse`) without storing it; passes ETag / Last-Modified through, so an unchanged feed is a 304                                                           |
| \*     | `/api/auth/*`            | Better Auth: sign-up, sign-in, sign-out, session, email verification by code, password reset and change (see [Auth](#auth))                                                                                    |
| GET    | `/api/subscriptions`     | Signed in: the reader's subscriptions (`SubscriptionListResponse`) with each feed's health (active / stale / error / dead), sorted by title                                                                    |
| POST   | `/api/subscriptions`     | Signed in: `{ url, categoryId? }` fetches and checks the feed, then subscribes → 201 + `Location`; 409 `already_subscribed`; 30 per reader per 10 min                                                          |
| PATCH  | `/api/subscriptions/:id` | Signed in: `{ customTitle?, categoryId? }` renames and/or moves it (`null` = clear / Uncategorized); another reader's id → 404                                                                                 |
| DELETE | `/api/subscriptions/:id` | Signed in: unsubscribes → 204; bookmarks stay; another reader's id → 404                                                                                                                                       |
| GET    | `/api/items`             | Signed in: one page of articles (`ItemListResponse`), newest first; `?feed=` or `?category=` (`uncategorized` too), `unread=true`, `order=oldest`, `limit=` (1–100, default 30), `cursor=` (from `nextCursor`) |
| GET    | `/api/items/counts`      | Signed in: item and unread counts per feed, per category (empty ones included, Uncategorized last) and in total (`ItemCountsResponse`)                                                                         |
| GET    | `/api/items/:id`         | Signed in: one article with its sanitized `contentHtml` (`ItemResponse`); doesn't mark it read; a feed the reader doesn't follow → 404                                                                         |
