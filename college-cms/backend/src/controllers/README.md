# `controllers/` — HTTP in, HTTP out

Controllers sit between routes and services. Their job:

1. **Read** the request (params, body)
2. **Validate** it — reject bad input with 400 *before* touching the DB
3. **Call** a service function
4. **Shape** the response and pick the correct status code

They contain **no SQL** — that's the service layer's job.

All three controllers are `async` functions matching Express's
`(req, res)` signature, exported as named exports and imported wholesale:

```ts
import * as courseController from '../controllers/courseController.js'
router.get('/courses', courseController.list)
```

## The 5-function CRUD template

Every controller has the same shape. Using `courseController.ts`:

### 1. List — lines 5-7

```ts
export async function list(_req: Request, res: Response) {
  res.json(await courseService.listCourses())
}
```

`_req` prefixed with underscore = "unused parameter" (lint convention).
`res.json()` sets `Content-Type: application/json` and serializes.

### 2. Get one — lines 9-11

```ts
res.json(await courseService.getCourse(numParam(req, 'id')))
```

`numParam` converts `"7"` → `7`, throwing a 400 if it's not a number.
If the service finds nothing it throws `HttpError(404)` — handled upstream.

### 3. Create — lines 13-27

```ts
const { code, title, description, credits, department } = req.body   // read
if (!code || !title) {                                               // validate
  res.status(400).json({ error: 'code and title are required' })
  return
}
const course = await courseService.createCourse({ ... })             // act
res.status(201).json(course)                                         // 201 = Created
```

`req.body` exists only because `server.ts` adds `express.json()`.

### 4. Update — lines 29-39 (the spread trick)

```ts
const course = await courseService.updateCourse(numParam(req, 'id'), {
  ...(code !== undefined && { code }),
  ...(title !== undefined && { title }),
  ...(description !== undefined && { description }),
  ...(credits !== undefined && { credits }),
  ...(department !== undefined && { department }),
})
```

How it evaluates:

- field **missing** → `undefined !== undefined` → `false` → `...(false)` → adds nothing
- field **present** → `true && { code }` → `{ code }` → `...{ code }` adds it

**Result:** only fields the client actually sent get updated. Omitted fields
keep their current DB values. This is partial update semantics on a PUT.

### 5. Delete — lines 41-44

```ts
await courseService.deleteCourse(numParam(req, 'id'))
res.status(204).end()
```

`204 No Content` + `.end()` — success with an empty body (nothing to return).

## Status codes used across all controllers

| Code | Meaning | Where |
| --- | --- | --- |
| 200 | OK | list, get, update |
| 201 | Created | create |
| 204 | No Content | delete |
| 400 | Bad Request | failed validation / bad param |
| 404 | Not Found | thrown by service, caught by `errorHandler` |
| 500 | Server Error | unknown failure, handled in `errorHandler` |

## Files

| File | Service it calls | Fields validated |
| --- | --- | --- |
| `pageController.ts` | `pageService` | `title`, `slug` required |
| `courseController.ts` | `courseService` | `code`, `title` required |
| `facultyController.ts` | `facultyService` | `name` required; also `listExcellence` / `createExcellence` (`title`, `year` required) |

## Known gaps (learning tasks)

- **No `asyncHandler` wrapper** — if a service rejects unexpectedly (DB down),
  nothing catches it and the request hangs. `middleware/error.ts` exports
  `asyncHandler` but it's unused.
- **Validation checks presence only** — `credits: "many"` passes the `if`
  checks. A schema validator (e.g. Zod) would catch type errors.

## Connections

```
routes/*.ts ──calls──→ THIS FOLDER
THIS FOLDER ──calls──→ ../services/*
THIS FOLDER ──uses──→ ../middleware/params.ts  (numParam, param)
THIS FOLDER ──throws──→ HttpError (from ../middleware/error.ts)  ← indirectly via services
```
