# Backend — Express + TypeScript + Drizzle ORM

The API server for College CMS. It receives HTTP requests from the frontend,
runs business logic, talks to PostgreSQL, and returns JSON.

## Run it

```bash
npm install
npm run db:push      # sync schema.ts into Postgres (dev shortcut)
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
| `npm run db:generate` | `schema.ts` → new SQL migration file |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema straight to DB (no migration file) |
| `npm run db:studio` | Browse tables in a GUI |

## Libraries

| Package | Role |
| --- | --- |
| `express` (v5) | Web framework: routing, middleware, HTTP |
| `cors` | Lets the browser (port 5173) call this server (port 4000) |
| `dotenv` | Loads `.env` into `process.env` |
| `drizzle-orm` | Type-safe query builder (SQL generated for you) |
| `postgres` | Low-level Postgres driver + connection pool |
| `drizzle-kit` | CLI: schema → migrations, plus DB studio |
| `tsx` | Runs TypeScript in Node without a build step |
| `typescript` | Compiler / type checker |

## Folder map

```
backend/
├── .env                  # DATABASE_URL, PORT  → NEVER commit this
├── package.json          # scripts + dependencies
├── tsconfig.json         # TypeScript rules (strict mode on)
├── drizzle.config.ts     # tells drizzle-kit where schema + DB are
├── drizzle/              # generated SQL migrations (committed)
│   ├── 0000_bent_timeslip.sql
│   └── meta/
└── src/
    ├── server.ts         # ⭐ entry point — wires everything together
    ├── db/               # connection + table definitions
    ├── middleware/       # error handling, URL param parsing
    ├── routes/           # URL → controller mapping
    ├── controllers/      # HTTP validation + status codes
    └── services/         # database queries (CRUD)
```

## How a request flows

```
HTTP request
  → server.ts          (pick router by URL prefix)
  → routes/*.ts        (match method + path)
  → controllers/*.ts   (validate input, set status code)
  → services/*.ts      (build the query)
  → db/index.ts        (Drizzle sends SQL to Postgres)
  ← JSON response travels back up
```

Errors thrown anywhere land in `middleware/error.ts` → JSON error response.

## Full route list

| Method | Route | Handler |
| --- | --- | --- |
| GET | `/api/health` | inline in `server.ts` |
| GET | `/api/admin/stats` | `routes/admin.ts` (inline query) |
| GET/POST | `/api/pages` | `pageController.list` / `.create` |
| GET | `/api/pages/:slug` | `pageController.getBySlug` |
| GET | `/api/pages/id/:id` | `pageController.getById` |
| PUT/DELETE | `/api/pages/:id` | `pageController.update` / `.remove` |
| GET/POST | `/api/academics/courses` | `courseController.list` / `.create` |
| GET/PUT/DELETE | `/api/academics/courses/:id` | `courseController` |
| GET/POST | `/api/faculty` | `facultyController.list` / `.create` |
| PUT/DELETE | `/api/faculty/:id` | `facultyController.update` / `.remove` |
| GET/POST | `/api/excellence` | `facultyController.listExcellence` / `.createExcellence` |

## Database workflow

```
Edit src/db/schema.ts
  → npm run db:generate    (creates drizzle/0001_*.sql)
  → npm run db:migrate     (applies it to Postgres)
```

Tables: `pages`, `courses`, `faculty`, `excellence`.
