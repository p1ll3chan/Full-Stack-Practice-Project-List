# `middleware/` — Functions that run before your handler

In Express, **middleware** = `function(req, res, next)`. They run in sequence
as a pipeline. This folder holds two helpers used everywhere else.

## `error.ts`

### `HttpError` (lines 3-10)

```ts
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}
```

A normal `Error` that also carries an HTTP status code, so a service can say
*"this is a 404"* without knowing anything about Express.

- `extends Error` — inherits `message`, `stack`, etc.
- `public status` — TypeScript **parameter property**: automatically becomes
  `this.status = status`.

**Thrown by:** every service (`pageService`, `courseService`, `facultyService`)
and `middleware/params.ts`.
**Caught by:** `errorHandler`.

### `notFound` (lines 12-14)

```ts
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' })
}
```

3 parameters = normal middleware. Mounted in `server.ts` **before**
`errorHandler` so any URL that matched no route gets a JSON 404 instead of
Express's default HTML page.

### `errorHandler` (lines 16-23)

```ts
export function errorHandler(err, _req, res, _next) { ... }
```

**4 parameters** is how Express recognizes an *error handler*. Logic:

1. `err instanceof HttpError` → respond with `err.status` + `err.message`
2. anything else → `console.error(err)` then generic `500`

The generic 500 is deliberate: never leak stack traces or SQL to the client.

### `asyncHandler` (lines 25-31)

```ts
return (req, res, next) => { fn(req, res, next).catch(next) }
```

Solves a classic Node bug: if an `async` route handler rejects, Express 4
**cannot see it** — the request hangs forever. This wrapper catches the
rejection and forwards it to `errorHandler`.

> ⚠️ Currently **unused** in this project — controllers call `await` directly.
> Wrapping them with `asyncHandler` is a known TODO.

## `params.ts`

URL parameters are always strings — `/api/courses/abc` gives you `"abc"`.

### `param(req, name)` (lines 4-7)

Reads `req.params[name]` and unwraps it if Express gave an array (Express 5
can produce arrays for repeated params).

### `numParam(req, name)` (lines 9-15)

```ts
const n = Number(param(req, name))
if (Number.isNaN(n)) throw new HttpError(400, `Invalid ${name}`)
return n
```

Converts to a number, throws **400 Bad Request** if it isn't one. This is
input validation at the edge — never trust what comes from the URL.

**Used by:** `courseController`, `facultyController`, `pageController` — every
`GET/PUT/DELETE /:id` route.

## Order matters

Registered in `server.ts`:

```ts
app.use(notFound)       // 1st: catch unmatched URLs
app.use(errorHandler)   // 2nd: catch everything else — MUST be last
```

Middleware run in registration order. An error handler placed before routes
would never see route errors.
