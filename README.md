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

The repo is a **Bun workspace** with three packages: `frontend/`, `backend/` and `packages/shared/`. Each has its own `package.json`, but there is one `bun.lock` and one (hoisted) `node_modules` at the root. Run `bun install` from the root; add a dependency inside the package that needs it (`cd backend && bun add x`).

`packages/shared` (`@frontpage/shared`) holds code both sides use, starting with the API response types. Backend and frontend import it the same way (`import type { HealthResponse } from "@frontpage/shared"`), so the API contract is defined once.

```
.
├── packages/
│   └── shared/               # @frontpage/shared: code used by both sides
│       └── src/api.ts        #   API response types (the backend ↔ frontend contract)
├── frontend/                 # Next.js → Vercel (Root Directory: frontend)
│   ├── vercel.json
│   ├── .env.example
│   └── src/
│       ├── app/              # routes, layout, globals.css (Tailwind + theme)
│       ├── components/
│       ├── lib/api.ts        # server-side client for the backend
│       └── styles/tokens.css # brand design tokens
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
│       ├── env.ts            # typed environment variables
│       ├── modules/          # one folder per feature; each owns its routes, logic and tables
│       │   ├── health/       #   GET /api/health (routes → controller)
│       │   └── feeds/        #   GET /api/fetch (routes → controller → service) + Drizzle "feeds" table
│       ├── middleware/       # Express middleware shared by all modules (404, error handler; later auth)
│       ├── db/               # Drizzle client (index.ts) + schema registry (schema.ts re-exports every module's tables)
│       ├── lib/              # framework-free helpers used across modules (feed fetching/parsing, email…)
│       ├── types/            # backend-only types shared across modules (create when needed; API types go in packages/shared)
│       └── scripts/          # one-off scripts run with `bun src/scripts/<name>.ts` (e.g. seeding)
├── docs/                     # challenge spec, guidance, brief (local reference, git-ignored)
├── package.json              # workspace definition + root scripts
├── bun.lock · bunfig.toml    # single lockfile; hoisted node_modules
├── AGENTS.md / CLAUDE.md     # AI collaboration context
└── .gitignore · .cursorignore · .aiignore · .claude/settings.json
```

### Backend modules

Each feature lives in `backend/src/modules/<feature>/`, with files named after the feature:

| File                      | Holds                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `<feature>.routes.ts`     | Express `Router`, mounted in `app.ts` (`app.use("/api/<feature>", router)`). Only maps URL + method → controller          |
| `<feature>.controller.ts` | HTTP in/out: reads `req` (query, params, headers, body), calls the service, sets status/headers, maps errors to responses |
| `<feature>.service.ts`    | Business logic and database queries; controllers call this. Never touches `req`/`res`                                     |
| `<feature>.schema.ts`     | Drizzle table definitions; **also export it from `src/db/schema.ts`** so drizzle-kit and the db client see it             |
| `<feature>.types.ts`      | Types used only inside this module                                                                                        |

Requests flow **routes → controller → service**: keep handler bodies out of routes files and HTTP details out of services, so services stay reusable (e.g. by background jobs) and testable without Express. Only create the files a module needs: `health/` has routes + controller; `feeds/` has routes, controller, service and its table.

The sample feeds live in `backend/data/` because only the backend reads them.

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
| `migrate`  | —                                                         | One-shot `drizzle-kit push` that syncs the schema before the API starts |

- **Dependencies:** `node_modules` lives inside the containers, not on the bind mount. After `bun add`, run `bun run docker:up` again to reinstall.
- **Neon stays untouched:** because of the bind mount, `backend/.env` is visible in the containers. Bun runs with `--no-env-file`, and compose sets every database variable explicitly, so the stack only talks to the local Postgres. Keep it that way if you edit `docker-compose.yml`.
- **File names:** the images are built from `backend/Dockerfile.local` and `frontend/Dockerfile.local`. They're named `.local` so Railway keeps building the backend with Railpack instead of picking up a `Dockerfile`.

## Scripts (repo root)

| Command                                                        | What it runs                                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `bun dev`                                                      | Both dev servers in parallel                                                |
| `bun run dev:frontend` / `dev:backend`                         | One dev server                                                              |
| `bun run build`                                                | Production build of the frontend                                            |
| `bun run build:backend`                                        | Type-check the backend (Railway's build step; the backend runs from source) |
| `bun run start:frontend` / `start:backend`                     | Production servers                                                          |
| `bun run typecheck`                                            | Type-check both projects                                                    |
| `bun run test` / `test:watch`                                  | Backend API tests (`bun test`)                                              |
| `bun run lint`                                                 | Lint the frontend                                                           |
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

- **Backend:** server (`PORT`, `WEB_ORIGIN`), Neon (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`), auth (`AUTH_SECRET`, `AUTH_URL`), password-reset email (`RESEND_API_KEY`, `EMAIL_FROM`), feed fetching (`FEED_*`). Read through `backend/src/env.ts`.
- **Frontend:** `API_URL` (the Railway URL) and `NEXT_PUBLIC_SITE_URL`.

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

Without `DATABASE_URL` the backend still runs, and `/api/health` reports the database as `skipped`.

## Deploying

Deploy the **backend first**, because the frontend needs its URL.

### Backend → Railway

1. Railway → **New Project → Deploy from GitHub repo** → pick this repo.
2. In the service's **Settings**:

    | Setting            | Value                                                                       | Why                                                                                               |
    | ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
    | Root Directory     | _(empty: repo root)_                                                        | The backend needs `packages/shared` and the root `bun.lock`                                       |
    | Build Command      | `bun run build:backend`                                                     | Typechecks the backend. Without it Railpack would run the root `build`, which builds the frontend |
    | Start Command      | `bun run start:backend`                                                     | Runs `bun src/index.ts` inside `backend/`                                                         |
    | Watch Paths        | `/backend/**`, `/packages/**`, `/package.json`, `/bun.lock`, `/bunfig.toml` | Frontend-only commits don't redeploy the backend                                                  |
    | Healthcheck Path   | `/api/health`                                                               | Railway waits for this before switching traffic                                                   |
    | Pre-deploy Command | `bun run db:migrate`                                                        | _Only once `DATABASE_URL` is set and you use migration files_                                     |
    | Networking         | **Generate Domain**                                                         | Gives you `https://<name>.up.railway.app`                                                         |

    Railpack detects Bun from `packageManager` in the root `package.json` and installs the whole workspace. Railway injects `PORT`.

3. **Variables:** add those from `backend/.env.example`. Leave out `PORT`, and set `WEB_ORIGIN` to your Vercel domain and `NODE_ENV=production`.

### Frontend → Vercel

1. Vercel → **Add New → Project** → import this repo.
2. Set **Root Directory** to `frontend`, and keep **Include files outside the root directory in the Build Step** enabled (Settings → Build and Deployment), so the build can see `packages/shared` and the root `bun.lock`. Next.js is detected; `frontend/vercel.json` pins the Bun install and build commands. `bun install` run inside `frontend/` installs from the workspace root.
3. **Environment Variables:** `API_URL` = the Railway domain, and `NEXT_PUBLIC_SITE_URL` = your Vercel domain.
4. Deploy, then put the Vercel domain into the backend's `WEB_ORIGIN` on Railway.

To skip Vercel builds for backend-only commits, add an `ignoreCommand` to `frontend/vercel.json` that also watches the shared code: `git diff --quiet HEAD^ HEAD -- . ../packages ../package.json ../bun.lock`.

> Vercel preview deployments call the same `API_URL` as production unless you set a different value for the _Preview_ environment (for example, a Railway staging environment).

## Ignore files

| File                    | Read by                        | Purpose                                                                                                          |
| ----------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `.gitignore`            | Git                            | Dependencies, builds, env files and secrets, IDE files, local AI settings, challenge reference docs              |
| `.claude/settings.json` | Claude Code                    | `permissions.deny` stops Claude from reading env files and secrets, or printing them via the Vercel/Railway CLIs |
| `.cursorignore`         | Cursor                         | Hides secrets and generated noise from indexing and AI                                                           |
| `.aiignore`             | JetBrains AI Assistant / Junie | Same list as `.cursorignore`                                                                                     |

The AI ignore lists deliberately **don't** hide `docs/`, `AGENTS.md` or `CLAUDE.md`. Git ignores those, but AI tools need them. GitHub Copilot has no ignore file: configure content exclusion in the repository's GitHub settings.

## API

| Method | Path          | Description                                                    |
| ------ | ------------- | -------------------------------------------------------------- |
| GET    | `/api/health` | `{ api: "ok", database: "connected" \| "skipped" \| "error" }` |
