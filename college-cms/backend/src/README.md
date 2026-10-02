# `src/` — Application source code

Everything Express runs lives here. Nothing in this folder is compiled ahead
of time — `tsx` runs it directly in dev, `tsc` compiles it to `dist/` for
production.

## Entry point: `server.ts` → `app.ts`

`server.ts` is deliberately tiny: it loads `dotenv/config` **first** (before
anything reads `process.env`) and calls `app.listen(PORT)`.

`app.ts` builds the Express app, in this order:

1. `app.disable('x-powered-by')`
2. Security headers (`middleware/security.ts`)
3. CORS allowlist (`CORS_ORIGINS` env, default localhost:5173)
4. `express.json({ limit: '1mb' })` — malformed JSON → 400 `invalid_json`, oversize → 413
5. `GET /api/health` and `GET /api/openapi.json`
6. Public routers (read-only) and `app.use('/api/admin', authenticate, requireRole('editor'), adminRouter)`
7. `notFound` then `errorHandler` — **must be last**

```ts
app.use('/api/pages', pagesRouter)
app.use('/api/streams', streamsRouter)
app.use('/api/academics', academicsRouter)
app.use('/api/faculty', facultyRouter)
app.use('/api/excellence', excellenceRouter)
app.use('/api/excellence-domains', excellenceDomainsRouter)
app.use('/api/degree-levels', degreeLevelsRouter)
app.use('/api/contact', contactRouter)
app.use('/api/admin', authenticate, requireRole('editor'), adminRouter)
```

## The layered pattern

Every feature follows the same 3-file chain:

| Layer | Folder | Job | Knows about HTTP? |
| --- | --- | --- | --- |
| Route | `routes/` | URL + method → function | Yes (just mapping) |
| Controller | `controllers/` | zod-validate input, pick status code | Yes |
| Service | `services/` | Query the database | **No** |

Why separate them: you can change the database (service only), change URLs
(route only), or add validation (controller only) without touching the rest.

## Files

| File/folder | Role |
| --- | --- |
| `app.ts` | Express app: middleware order, router mounts, error handling |
| `server.ts` | dotenv + `app.listen(PORT)` |
| `db/index.ts` | Opens the Postgres pool, exports `db` |
| `db/tables/*.ts` | One file per table group + `index.ts` barrel; `schema.ts` re-exports it |
| `http/respond.ts` | `ok` / `created` / `noContent` / `list` envelopes + `metaFor` |
| `http/validate.ts` | `parse(schema, value)` → typed value or 400 `validation_error` |
| `http/query.ts` | `listQuery` (page/limit/sort/order + filters), `pathId`, `reorderBody`, `boolish` |
| `http/schemas.ts` | Shared zod pieces: `slugSchema`, `trimmed`, `richDocSchema` |
| `middleware/error.ts` | `HttpError`, `ErrorCode`, PG/body-parser/Zod mapping, `notFound`, `errorHandler`, `asyncHandler` |
| `middleware/auth.ts` | `authenticate` (bearer token → `req.auth`), `requireRole` |
| `middleware/security.ts` | `securityHeaders` (nosniff, frame deny, CSP, no powered-by) |
| `routes/*.ts` | Public read-only routers |
| `routes/admin/*` | Auth'd CRUD/publish/reorder routers |
| `controllers/*.ts` | One per resource: zod schemas, status codes |
| `services/*.ts` | One per resource (+ `like.ts` ilike helper, `reorder.ts` permutation helper) |
| `tests/` | `db.test.ts` (schema) and `api.test.ts` (HTTP integration) |

## Import convention

Local imports end in `.js` even though files are `.ts`:

```ts
import { db } from './db/index.js'   // file is actually db/index.ts
```

This is required by `"module": "NodeNext"` in `tsconfig.json`. TypeScript
resolves to the *output* extension. Do not "fix" it to `.ts`.

## Rules of the road

- **No comments in code** (project rule).
- Services never import Express types; controllers never write raw SQL.
- Anything that can fail for a client throws `HttpError(status, message, code)`
  — `errorHandler` renders it as `{error:{code,message,details?}}`.
- Multi-table writes (page + blocks, faculty + details) run in one `db.transaction`.

## Where to add a new feature

1. Table → `db/tables/yourTable.ts` (+ export from `db/tables/index.ts`) →
   `npm run db:generate && npm run db:migrate`
2. Queries → `services/yourService.ts`
3. HTTP logic → `controllers/yourController.ts` (zod schema + `parse`)
4. Public read → `routes/yourRoute.ts`; write → `routes/admin/yourRoute.ts`
5. Mount it → `app.ts`
6. Document it → `docs/openapi.json`, and cover it in `tests/api.test.ts`
