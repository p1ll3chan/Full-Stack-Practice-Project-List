# College CMS

Full-stack college content management system: React + TypeScript + Vite frontend, Express + TypeScript backend, Drizzle ORM on PostgreSQL.

## Documentation

Every folder has a `README.md` explaining what it does and which files it
connects to. Start here:

| Folder | Read for |
| --- | --- |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Production setup: env vars, nginx (SPA + SSE), smoke test, security checklist |
| [`backend/`](backend/README.md) | Server setup, libraries, full route list, request flow |
| [`backend/src/`](backend/src/README.md) | Entry point + the route → controller → service pattern |
| [`backend/src/db/`](backend/src/db/README.md) | Postgres connection, table schema, generated types |
| [`backend/src/routes/`](backend/src/routes/README.md) | URL mapping, public vs admin routers, route-order gotchas |
| [`backend/src/controllers/`](backend/src/controllers/README.md) | zod validation, status codes, response envelopes |
| [`backend/src/services/`](backend/src/services/README.md) | Drizzle CRUD template, visibility rules, where 404s come from |
| [`backend/src/middleware/`](backend/src/middleware/README.md) | `HttpError`, error mapping, bearer auth, security headers |
| [`backend/drizzle/`](backend/drizzle/README.md) | Generated SQL migrations and how to produce them |
| [`frontend/`](frontend/README.md) | Vite setup, the `/api` proxy, libraries, tests, data flow |
| [`frontend/src/`](frontend/src/README.md) | Bootstrap chain, full route table, shared conventions |
| [`frontend/src/api/`](frontend/src/api/README.md) | `fetch` wrapper (envelopes, `ApiError`), query keys, typed hooks, type contract |
| [`frontend/src/hooks/`](frontend/src/hooks/README.md) | `useApi` / `useApiList` — generics, effects, cleanup, refetch |
| [`frontend/src/components/`](frontend/src/components/README.md) | states, block registry, cards, shared stream/course navigation |
| [`frontend/src/pages/`](frontend/src/pages/README.md) | Public pages, CMS sections, the `/:slug` catch-all |
| [`frontend/src/tests/`](frontend/src/tests/README.md) | vitest suites: client, blocks, cards, routes, listings, admin auth/validation, phase5 live-sync |
| [`frontend/src/admin/`](frontend/src/admin/README.md) | Authenticated CMS: login/session, layout, managers + editors, block workflow, out-of-scope list |
| [`frontend/src/assets/`](frontend/src/assets/README.md) | Imported images vs `public/` |
| [`frontend/public/`](frontend/public/README.md) | Static files served as-is |

## Structure

```
college-cms/
├── frontend/          # Vite + React 19 + TypeScript
│   └── src/
│       ├── components/  # states, block registry, cards, StreamNav, CourseNav
│       ├── pages/       # Home, Departments, Academics, Faculty, Excellence, ...
│       ├── admin/       # authenticated CMS: session, guard, layout, managers/editors
│       ├── hooks/       # useApi / useApiList
│       ├── api/         # typed fetch client, query keys, hooks, types
│       ├── tests/       # vitest suites (client, blocks, routes, listings, admin, phase5)
│       ├── routes.tsx   # full route table (AppRoutes)
│       ├── App.tsx
│       └── main.tsx
├── backend/           # Express 5 + TypeScript + Drizzle ORM
│   ├── docs/          # openapi.json (served at GET /api/openapi.json)
│   └── src/
│       ├── app.ts       # Express app: middleware, routers, errors
│       ├── server.ts    # dotenv + listen
│       ├── routes/      # public GET-only routers + routes/admin/
│       ├── controllers/ # zod schemas + status codes
│       ├── services/    # database queries
│       ├── http/        # response envelopes, query + validation helpers
│       ├── db/          # tables/, schema.ts, index.ts
│       ├── middleware/  # errors, auth, security
│       └── tests/       # db + API integration tests
│   ├── drizzle/        # generated SQL migrations
│   ├── drizzle.config.ts
│   └── .env
└── README.md
```

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) — or any PostgreSQL 14+ instance

## Database

Start the bundled PostgreSQL container:

```bash
docker run -d --name college-cms-db \
  -e POSTGRES_USER=cms \
  -e POSTGRES_PASSWORD=cms_secret \
  -e POSTGRES_DB=college_cms \
  -p 5432:5432 \
  -v college-cms-pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

Connection settings live in `backend/.env` (`DATABASE_URL`).

## Backend

```bash
cd backend
npm install
npm run db:migrate     # apply committed migrations
npm run dev            # http://localhost:4000
```

Other scripts: `npm test`, `npm run typecheck`, `npm run build`,
`npm start`, `npm run db:studio`.

### API

Conventions (details in [`backend/README.md`](backend/README.md)):

- Success: `{ "data": ... }`; lists add `"meta": {page, limit, total, totalPages}`.
  Failures: `{ "error": { "code", "message", "details?" } }`.
- Public endpoints are **read-only**. All mutations (and admin reads like
  drafts and `/api/admin/stats`) live under `/api/admin/*` and require
  `Authorization: Bearer <token>` — tokens come from `ADMIN_TOKEN` /
  `EDITOR_TOKEN` in `backend/.env` (template: `backend/.env.example`).
- Rate limiting: global API budget plus a stricter window on login-sensitive
  routes; 429 responses carry `Retry-After`. Set `TRUST_PROXY` when behind a
  reverse proxy. Live updates stream from `GET /api/events` (SSE) — every
  admin mutation broadcasts `{entity, action, at}` with **no content data**.
- Full interactive spec: `GET /api/openapi.json` (also in `backend/docs/openapi.json`).

| Area | Public | Admin (auth'd) |
| --- | --- | --- |
| health/meta | `GET /api/health`, `GET /api/openapi.json` | `GET /api/admin/stats`, `GET /api/admin/whoami` |
| media | — | CRUD (URL-referenced images) |
| pages | `GET /api/pages`, `GET /api/pages/:slug` | CRUD, publish, blocks CRUD, reorder |
| streams | `GET /api/streams`, `GET /api/streams/:slug` | CRUD, activate, reorder, details |
| academics | `GET /api/academics/courses`, `/:id`, `details/:streamSlug` | course CRUD |
| degree levels | `GET /api/degree-levels`, `/:code` | CRUD, reorder, `PUT /admin/streams/:id/degree-levels` |
| faculty | `GET /api/faculty`, `/:id` | CRUD |
| excellence | `GET /api/excellence`, domains | CRUD, reorder |
| contact | `GET /api/contact` | `GET`/`PUT /api/admin/contact` |

## Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173 (proxies /api → :4000)
```

Other scripts: `npm test` (vitest), `npm run typecheck`, `npm run build`,
`npm run lint`, `npm run preview`.

## CMS admin (first account)

There are no default credentials and no sign-up — the backend authenticates
static bearer tokens from `backend/.env`:

```bash
openssl rand -hex 32    # → add ADMIN_TOKEN=... (and optionally EDITOR_TOKEN=...)
# restart the backend, then open http://localhost:5173/admin/login
```

- Paste the token; the frontend verifies it with `GET /api/admin/whoami` and
  keeps it **in memory only** (never localStorage — reload signs you out).
  Frontend guards are UX only; the server enforces auth on every
  `/api/admin/*` call (401) and `admin` role for deletes (403).
- From the sidebar: Pages (blocks: add/edit/reorder/publish/delete + draft
  preview), About, Departments (details, degree-level links, academic
  details, faculty intro), Academics (degree levels, courses with cascading
  stream→levels), Faculty, Excellence (items + domains), Media (URL library),
  Contact. Saves validate with zod mirrors before sending and only send
  changed fields.

**Not configured yet:** no file-upload storage (media is registered by URL),
no per-user accounts/sessions/audit trail (one shared token per role,
rotatable via `.env`), no autosave/versioning/draft pages (draft =
unpublished), overview/faculty intro edited as plain paragraphs.

**Live updates:** open pages subscribe to `GET /api/events` (SSE). A content
event makes public pages refetch their own data (stale-while-revalidate — the
current content stays on screen) and invalidates the admin query cache, so an
edit in one tab shows up in every other open tab within ~1 s.
