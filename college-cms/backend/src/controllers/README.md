# `controllers/` — HTTP in, HTTP out

Controllers sit between routes and services. Their job:

1. **Validate** the request — zod schemas on body, query, and path params;
   failures become 400 `validation_error` *before* touching the DB
2. **Call** a service function
3. **Shape** the response and pick the correct status code

They contain **no SQL** — that's the service layer's job.

All controllers are `async` functions matching Express's `(req, res)`
signature, exported as named exports and imported wholesale:

```ts
import * as courseController from '../controllers/courseController.js'
router.get('/courses', courseController.list)
```

## The pattern

Using `courseController.ts`:

### 1. Schemas at the top

```ts
const createSchema = z.strictObject({ title: trimmed(255), slug: slugSchema.optional(), ... })
const updateSchema = z.strictObject({ ...all fields optional }).refine(
  (value) => Object.keys(value).length > 0,
  { message: atLeastOneField },
)
const publicListQuery = listQuery({ sorts: ['code', 'title'] as const, defaultSort: 'code' })
```

- `z.strictObject` — unknown keys are a **400**, never silently ignored.
- update schemas require **at least one field** (no empty PUTs).
- `listQuery(...)` (`http/query.ts`) supplies `page`, `limit`, `sort`, `order`
  with zod types — `?limit=101` or `?order=sideways` fail validation instead of
  reaching SQL. Resource filters are added with `.extend({...})`, coercing
  query strings (`z.coerce.number()`) where needed.
- shared pieces live in `http/schemas.ts` (`slugSchema`, `trimmed`,
  `richDocSchema`, `atLeastOneField`).

### 2. Parse, then delegate

```ts
export async function adminUpdate(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)      // /api/admin/courses/abc → 400
  const body = parse(updateSchema, req.body)    // bad body → 400 + details
  ok(res, await courseService.updateCourse(id, body))
}
```

`parse(schema, value)` (`http/validate.ts`) throws
`HttpError(400, 'Request validation failed', 'validation_error', details)`
with one entry per zod issue (`{path, message}`).

### 3. Respond with an envelope helper

| Helper | Status | Body |
| --- | --- | --- |
| `ok(res, data)` | 200 | `{data}` |
| `created(res, data)` | 201 | `{data}` |
| `noContent(res)` | 204 | empty |
| `list(res, rows, metaFor(total, page, limit))` | 200 | `{data, meta}` |

Never hand-roll `res.json({...})` — the envelopes are the API contract.

## Status codes used

| Code | Meaning | Where |
| --- | --- | --- |
| 200 | OK | list, get, update, publish, reorder |
| 201 | Created | create |
| 204 | No Content | delete |
| 400 | `validation_error` / `bad_request` / `invalid_json` / `invalid_reference` | zod failures, bad path ids, malformed body, bad FK |
| 401 | `unauthorized` | missing/invalid bearer token (`auth.ts`) |
| 403 | `forbidden` | role too low (`auth.ts`) |
| 404 | `not_found` | thrown by service, caught by `errorHandler` |
| 409 | `conflict` | unique slug/code or record in use (via service pre-checks or PG mapping) |
| 413 | `payload_too_large` | body over 1mb |
| 500 | `internal_error` | unknown failure, logged server-side |

## Files

| File | Public handlers | Admin handlers (under `/api/admin`) |
| --- | --- | --- |
| `pageController.ts` | list, getBySlug, getById | CRUD, publish/unpublish, blocks CRUD + reorder |
| `streamController.ts` | list, getBySlug | CRUD, `/:id/active`, reorder |
| `courseController.ts` | list, getById | CRUD, `/:id/active`, reorder |
| `degreeLevelController.ts` | list, getBySlug | CRUD, reorder |
| `facultyController.ts` | list, getById | CRUD + `/:id/details` upsert |
| `excellenceController.ts` | list, getById | CRUD + reorder |
| `excellenceDomainController.ts` | list, getBySlug (+ active items) | CRUD |
| `contactController.ts` | get | upsert |
| `academicController.ts` | stream courses / degree levels / details | details upsert |
| `adminController.ts` | — | `GET /stats` |

## Connections

```
routes/*.ts ──calls──→ THIS FOLDER
THIS FOLDER ──calls──→ ../services/*
THIS FOLDER ──uses──→ ../http/*       (parse, listQuery, respond helpers)
THIS FOLDER ──throws──→ HttpError     (via ../middleware/error.ts)
```
