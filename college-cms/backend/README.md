# Backend — Express + TypeScript + Drizzle ORM

The API server for College CMS. It receives HTTP requests from the frontend,
runs business logic, talks to PostgreSQL, and returns JSON.

## Run it

```bash
npm install
npm run db:migrate   # apply committed migrations (schema lives in src/db/tables)
npm run dev          # start server with auto-restart on save
```

Server listens on `http://localhost:4000` (from `PORT` in `.env`).

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | `tsx watch src/server.ts` — runs TS directly, restarts on save |
| `npm run build` | `tsc` — compiles TS → `dist/` |
| `npm start` | Runs the compiled `dist/server.js` |
| `npm run typecheck` | Type-check only, writes nothing |
| `npm test` | `node --import tsx --test "src/**/*.test.ts"` — all test suites |
| `npm run db:generate` | Schema → new SQL migration file |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema straight to DB (no migration file) |
| `npm run db:studio` | Browse tables in a GUI |

There is **no linter** configured (typecheck + tests are the gates).

## Environment (`.env`, never commit — copy `.env.example`)

| Key | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `PORT` | HTTP port (dev: `4000`) |
| `NODE_ENV` | `development` / `production` |
| `ADMIN_TOKEN` | Bearer token for the `admin` role — **required or all admin routes 401** |
| `EDITOR_TOKEN` | Bearer token for the `editor` role |
| `CORS_ORIGINS` | Optional allowlist override; defaults to `http://localhost:5173,http://127.0.0.1:5173` |
| `TRUST_PROXY` | `true`/`1`/hop count — set behind nginx so rate limiting sees real client IPs |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` | Global API budget (default 300 req/60s) |
| `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS` | Login-sensitive budget (default 30 req/60s) |
| `RATE_LIMIT_DISABLED` | `true` disables rate limiting (tests/local only) |
| `SSE_HEARTBEAT_MS`, `SSE_MAX_CLIENTS` | `GET /api/events` heartbeat (25000 ms) and max concurrent streams (100 → 503) |

Auth fails closed: if a token env var is unset, that role's requests get 401.
Rate limiting fails open when `NODE_ENV=test` or `RATE_LIMIT_DISABLED=true`.
See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for production notes.

## Libraries

| Package | Role |
| --- | --- |
| `express` (v5) | Web framework: routing, middleware, HTTP |
| `zod` (v4) | Request validation: bodies, query, path params → typed objects |
| `cors` | Origin allowlist for browser calls (port 5173 → 4000) |
| `dotenv` | Loads `.env` into `process.env` |
| `drizzle-orm` | Type-safe query builder (SQL generated for you) |
| `postgres` | Low-level Postgres driver + connection pool |
| `drizzle-kit` | CLI: schema → migrations, plus DB studio |
| `tsx` | Runs TypeScript in Node without a build step |
| `typescript` | Compiler / type checker |

## Folder map

```
backend/
├── .env                  # DATABASE_URL, PORT, tokens → NEVER commit this
├── package.json          # scripts + dependencies
├── tsconfig.json         # TypeScript rules (strict mode on)
├── drizzle.config.ts     # tells drizzle-kit where schema + DB are
├── drizzle/              # generated SQL migrations (committed)
├── docs/
│   └── openapi.json      # OpenAPI 3.1 spec served at GET /api/openapi.json
└── src/
    ├── app.ts            # ⭐ Express app: middleware, routers, error handling
    ├── server.ts         # entry point: dotenv + app.listen(PORT)
    ├── db/               # connection + table definitions (tables/ + index.ts)
    ├── http/             # response envelopes, zod helpers, query parsing
    ├── middleware/       # error handling, auth, security headers
    ├── routes/           # URL → controller mapping (+ routes/admin/)
    ├── controllers/      # zod schemas + status codes
    ├── services/         # database queries (no HTTP knowledge)
    ├── import/           # Departments.csv import library
    ├── scripts/          # CLI entry points (import, seed)
    └── tests/            # db + API integration tests
```

## How a request flows

```
HTTP request
  → security headers → CORS → express.json (1mb)
  → app.ts           (health / openapi / routers by prefix)
  → routes/*.ts      (match method + path; admin routes hit auth first)
  → controllers/*.ts (parse(zod) input, call service, pick status code)
  → services/*.ts    (build the query, throw HttpError on problems)
  → db/index.ts      (Drizzle sends SQL to Postgres)
  ← {data} / {data,meta} envelope travels back up
```

Errors thrown anywhere land in `middleware/error.ts` → `{error:{code,message}}`.

## API conventions

**Success envelopes** (`src/http/respond.ts`):

- `200/201` → `{ "data": ... }`
- list reads → `{ "data": [...], "meta": { page, limit, total, totalPages } }`
- `204` → empty body

**Error envelope** (single shape for every failure):

```json
{ "error": { "code": "validation_error", "message": "Request validation failed", "details": [ ... ] } }
```

Codes: `bad_request, unauthorized, forbidden, not_found, conflict,
validation_error, invalid_json, payload_too_large, invalid_reference,
internal_error`. Unknown failures are logged server-side and returned as a
generic 500 — no stack traces, SQL, or secrets leave the process.

**Auth**: all `/api/admin/*` routes require `Authorization: Bearer <token>`.
Tokens map to roles `editor < admin` (derived server-side, never from the
request body). Editors may create/update/publish/reorder; **deletes and
role-gated routes require admin**.

**Validation**: controllers `parse(zodSchema, req.body | req.query | req.params)`
(`src/http/validate.ts`); failures → 400 `validation_error` with `details`.
Query strings use the `listQuery` factory (`page`, `limit`, `sort`, `order`,
resource-specific filters) and are coerced/typed, never trusted raw.

**Visibility** (public reads hide inactive content):

- `pages`, `page_blocks` → `published = true`
- `streams`, `courses`, `degree_levels`, `excellence_domains`, `excellence` → `is_active`
- `faculty` → visible iff its stream is null or active
- details endpoints (`/api/academics/...`) → 404 when the stream is missing/inactive

**CORS / headers**: origin allowlist (403 on unknown origins), plus
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a restrictive
`Content-Security-Policy`, and no `X-Powered-By`.

## Route summary

Full machine-readable list: `GET /api/openapi.json` (OpenAPI 3.1, `docs/openapi.json`).

| Area | Public (GET only) | Admin (`/api/admin`, auth'd) |
| --- | --- | --- |
| pages | `/api/pages`, `/api/pages/:slug` | full CRUD + publish/unpublish + reorder + blocks CRUD/reorder |
| streams | `/api/streams`, `/api/streams/:slug` | CRUD + activate + reorder + `:id/details` + `:id/faculty-details` |
| academics | `/api/academics/courses`, `.../courses/:id`, `.../details/:streamSlug` | courses CRUD (+in-use 409 checks) |
| degree levels | `/api/degree-levels`, `/api/degree-levels/:code` | CRUD + reorder |
| faculty | `/api/faculty`, `/api/faculty/:id` | CRUD + `:id/details` upsert |
| excellence | `/api/excellence`, domains + items | CRUD for domains/items |
| contact | `/api/contact` | GET/PUT upsert |
| meta | `/api/health`, `/api/openapi.json` | `/api/admin/stats` |

Public mutations were removed: writes and admin-only reads live exclusively
under `/api/admin` (legacy frontend write calls now 401/404 — Phase 3 adapts
the frontend).

## Tests

```bash
npm test
```

- `src/import/*.test.ts`, `src/tests/db.test.ts` — unit/DB tests on `college_cms_test`
- `src/tests/api.test.ts` — boots the real app on an ephemeral port against
  `college_cms_api_test` (name must end in `_test`; schema is dropped,
  migrated, and reseeded per run) and asserts envelopes, visibility, auth
  roles, validation, conflicts, pagination, reorder, CORS, and headers.
- `src/tests/phase5.test.ts` — live sync and hardening: empty-dataset
  responses, the full admin → public workflow for every content type
  (referential-integrity 409s included), SSE broadcast on successful admin
  mutations (rejected/GET requests never emit, payload carries no content
  data), per-scope rate-limit windows/expiry, and `X-Forwarded-For` buckets.

## Database workflow

```
Edit src/db/tables/*.ts
  → npm run db:generate    (creates drizzle/000N_*.sql)
  → npm run db:migrate     (applies it to Postgres)
```

Tables: `pages`, `page_blocks`, `page_block_gallery_items`, `streams`,
`degree_levels`, `degree_level_streams`, `courses`, `faculty_members`,
`faculty_details`, `excellence_domains`, `excellence`, `academic_details`,
`college_contact`, `media`.
