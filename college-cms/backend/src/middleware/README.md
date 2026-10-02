# `middleware/` — Functions that run before your handler

In Express, **middleware** = `function(req, res, next)`. They run in sequence
as a pipeline. Registration order in `app.ts`:

```
securityHeaders → cors → express.json → routes → notFound → errorHandler
```

`authenticate` / `requireRole` run only on the admin mount, before any admin
route handler.

## `error.ts`

### `HttpError`

```ts
export class HttpError extends Error {
  constructor(status: number, message: string, code?: ErrorCode, details?: ErrorDetail[])
}
```

A normal `Error` that also carries an HTTP status, a machine-readable
`ErrorCode`, and optional `details` (used by validation failures). If `code`
is omitted it's derived from the status (`404 → not_found`, `409 → conflict`,
`5xx → internal_error`, ...).

**Thrown by:** services and controllers. **Caught by:** `errorHandler`.

### `ErrorCode`

Closed union: `bad_request | unauthorized | forbidden | not_found | conflict |
validation_error | invalid_json | payload_too_large | invalid_reference |
internal_error`. This is the stable contract clients switch on — see
`docs/openapi.json`.

### `notFound`

Mounted before `errorHandler` so any URL that matched no route gets
`404 {error:{code:'not_found',...}}` instead of Express's default HTML page.

### `errorHandler` (4 parameters = Express error handler)

Rendering order:

1. `HttpError` → its status/code/message/details
2. `ZodError` (thrown outside `parse()`) → 400 `validation_error` + issue list
3. **body-parser failures** — `entity.parse.failed` → 400 `invalid_json`,
   `entity.too.large` → 413 `payload_too_large`
4. **Postgres failures** — walks the `cause` chain looking for an SQLSTATE
   (`/^[0-9A-Z]{5}$/` + `severity`) and maps it:
   - known constraint names in `CONSTRAINT_FAILURES`
     (`pages_slug_unique` → 409, `page_blocks_image_requires_media` → 400, ...)
   - `23505` unique → 409, `23503` FK → 400 `invalid_reference`,
     `23514`/`23502`/`22xxx` → 400 `validation_error`
5. anything else → `console.error(err)` then generic
   `500 {error:{code:'internal_error'}}`

The generic 500 is deliberate: **never leak stack traces, SQL, or constraint
names to the client.** (The server log keeps the real error.)

### `asyncHandler`

Wraps an async handler so rejections reach `errorHandler`
(`fn(req,res,next).catch(next)`). Express 5 propagates async rejections on
its own, so this is currently unused — available if you need it.

## `auth.ts`

### `authenticate`

Reads `Authorization: Bearer <token>`, compares SHA-256 digests with
`timingSafeEqual` against `ADMIN_TOKEN` / `EDITOR_TOKEN` env vars, and sets
`req.auth = { role: 'admin' | 'editor' }`.

- Tokens are matched to roles **server-side** — the request can never claim
  its own role.
- **Fails closed:** if a token env var is unset, requests carrying that token
  get 401 (and no token at all always gets 401).

### `requireRole(minimum)`

Express factory:

```ts
app.use('/api/admin', authenticate, requireRole('editor'), adminRouter)
```

- no `req.auth` → `401` + `WWW-Authenticate: Bearer`
- role rank below `minimum` (`editor < admin`) → `403`

Individual `DELETE` handlers attach `requireRole('admin')` so editors can
create/update/publish/reorder but not destroy.

## `security.ts`

`securityHeaders` sets (on every response):

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; ...`
- removes `X-Powered-By` (also disabled in `app.ts`)

CORS is configured in `app.ts` (allowlist from `CORS_ORIGINS`, default
localhost:5173 — unknown origins get no allow-origin header).

## Order matters

```ts
app.use(notFound)       // 1st: catch unmatched URLs
app.use(errorHandler)   // 2nd: catch everything else — MUST be last
```

Middleware run in registration order. An error handler placed before routes
would never see route errors.

## Note on `params.ts`

The old `middleware/params.ts` (`param()` / `numParam()`) is **gone** — path
parameters are validated by zod (`pathId` in `src/http/query.ts`, called from
controllers), which reports failures as 400 `validation_error` with details.
