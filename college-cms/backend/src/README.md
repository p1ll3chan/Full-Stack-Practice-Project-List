# `src/` — Application source code

Everything Express runs lives here. Nothing in this folder is compiled ahead
of time — `tsx` runs it directly in dev, `tsc` compiles it to `dist/` for
production.

## Entry point: `server.ts`

`server.ts` is the only file that runs on its own. It:

1. `import 'dotenv/config'` — loads `.env` **first**, before anything reads `process.env`
2. Creates the Express app and reads `PORT`
3. Adds global middleware: `cors()` and `express.json()`
4. Defines `GET /api/health` (pings the DB)
5. Mounts the 5 routers at their prefixes
6. Registers `notFound` then `errorHandler` — **must be last**
7. `app.listen(port, ...)` — starts the server

```ts
app.use('/api/pages', pagesRouter)
app.use('/api/academics', academicsRouter)
app.use('/api/faculty', facultyRouter)
app.use('/api/excellence', excellenceRouter)
app.use('/api/admin', adminRouter)
```

## The layered pattern

Every feature follows the same 3-file chain:

| Layer | Folder | Job | Knows about HTTP? |
| --- | --- | --- | --- |
| Route | `routes/` | URL + method → function | Yes (just mapping) |
| Controller | `controllers/` | Validate input, pick status code | Yes |
| Service | `services/` | Query the database | **No** |

Why separate them: you can change the database (service only), change URLs
(route only), or add validation (controller only) without touching the rest.

## Files

| File | Role |
| --- | --- |
| `server.ts` | App setup, middleware order, router mounting, listen |
| `db/index.ts` | Opens the Postgres pool, exports `db` |
| `db/schema.ts` | Table definitions + generated row types |
| `middleware/error.ts` | `HttpError`, `notFound`, `errorHandler`, `asyncHandler` |
| `middleware/params.ts` | `param()` / `numParam()` — safe URL param reading |
| `routes/*.ts` | 5 routers: pages, academics, faculty, excellence, admin |
| `controllers/*.ts` | 3 controllers: page, course, faculty |
| `services/*.ts` | 3 services: page, course, faculty (+ excellence) |

## Import convention

Local imports end in `.js` even though files are `.ts`:

```ts
import { db } from './db/index.js'   // file is actually db/index.ts
```

This is required by `"module": "NodeNext"` in `tsconfig.json`. TypeScript
resolves to the *output* extension. Do not "fix" it to `.ts`.

## Where to add a new feature

1. Table → `db/schema.ts` → `npm run db:generate && npm run db:migrate`
2. Queries → `services/yourService.ts`
3. HTTP logic → `controllers/yourController.ts`
4. URL → `routes/yourRoute.ts`
5. Mount it → `server.ts`
