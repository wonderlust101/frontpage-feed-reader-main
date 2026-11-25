# Backend tests

Tests use `bun:test` and run without a database server or network. Tests that need Postgres use `createTestDb()` (in-memory PGlite, built from the committed migrations). Run them from the repo root:

| Command                  | What it runs                                                           |
| ------------------------ | ---------------------------------------------------------------------- |
| `bun run test`           | Every offline test (what CI runs)                                      |
| `bun run test:live`      | Only `live/`: hits the real curated feeds over the network             |
| `bun run fixtures:feeds` | Re-downloads the curated feed snapshots into `fixtures/feeds/curated/` |

## Layout

The test tree **mirrors `src/`**: the test for `src/<path>/<name>.ts` is `test/<path>/<name>.test.ts`.

```
test/
├── README.md               ← this file
├── setup.ts                ← preloaded by bunfig.toml: pins env (no DB, local-only fetching)
├── structure.test.ts       ← enforces this layout in CI
├── *.test.ts               ← src/*.ts: app (CORS, JSON 404, error handler), env, server-lifecycle
├── <folder>/               ← src/<folder>/ for db, errors, middleware and lib (lib/feed/ is the feed engine)
├── modules/<feature>/      ← src/modules/<feature>/: HTTP routes via startTestServer(), services via createTestDb()
├── live/*.live.test.ts     ← real network; skipped unless LIVE_FEEDS=1
├── helpers/                ← shared test code, no tests
│   ├── test-server.ts      ← startTestServer(app?): the API (or a test's own app) on a random port
│   ├── feed-server.ts      ← fake upstream feed server (redirects, 304, timeouts, 4xx/5xx); serve() swaps a path's body
│   ├── errors.ts           ← httpErrorFrom() / httpErrorThrownBy(): the HttpError a call rejects or throws with
│   ├── factories.ts        ← newUser(db), newCategory(db, …) and SAMPLE_UUID, shared by the database tests
│   ├── fixtures.ts         ← readFixture(), curatedFixtures
│   └── test-db.ts          ← createTestDb(): in-memory Postgres (PGlite) with every migration applied
└── fixtures/feeds/
    ├── curated/            ← byte-exact snapshots of the 19 curated feeds + manifest.json
    └── odd/                ← hand-written broken/edge-case feeds, one problem per file
```

## Rules

`structure.test.ts` enforces these, so a misplaced file fails CI:

1. **Mirror `src/`.** A test for `src/modules/feeds/feeds.routes.ts` goes in `test/modules/feeds/feeds.routes.test.ts`. A test whose mirrored source file doesn't exist fails.
2. **Helpers are not tests.** Shared setup goes in `helpers/`, and nothing in it ends in `.test.ts`.
3. **Network tests are opt-in.** Anything that needs the internet goes in `live/`, is named `*.live.test.ts`, and is wrapped in `describe.skipIf(!process.env.LIVE_FEEDS)`. CI must never depend on someone else's server.
4. **Fixtures are data, not code.** `fixtures/` is byte-exact (`.gitattributes`: `-text`). Don't open these files in an editor that re-saves them, and don't run Prettier on them.
5. **No orphan fixtures.** Every file in `fixtures/feeds/odd/` must be referenced by a test, and `curated/` must match `manifest.json` exactly.

## Adding things

- **A new module or endpoint:** add `test/modules/<feature>/<feature>.routes.test.ts` using `startTestServer()`, and a matching request in `backend/requests/api.http`.
- **A new feed edge case:** add one file to `fixtures/feeds/odd/` named after the problem (e.g. `atom-xhtml-content.xml`) and assert on it in `lib/feed/normalize.test.ts`.
- **A changed curated feed list** (`data/sample-feeds.json`): run `bun run fixtures:feeds`, then `bun run test`.
