# `routes/` — URL → controller mapping

**Deliberately thin.** A route file contains no logic, no validation, no
queries — only "this URL + this HTTP method calls this function."

Each file creates an Express `Router()`, registers handlers, and exports it.
`server.ts` mounts them at a prefix:

```ts
app.use('/api/pages', pagesRouter)       // routes/pages.ts
app.use('/api/academics', academicsRouter)
app.use('/api/faculty', facultyRouter)
app.use('/api/excellence', excellenceRouter)
app.use('/api/admin', adminRouter)
```

Final URL = **mount prefix + route path**. Example:
`routes/academics.ts` has `router.get('/courses', ...)` mounted at
`/api/academics` → `GET /api/academics/courses`.

## HTTP verbs → CRUD

| Verb | Action | Success code |
| --- | --- | --- |
| `GET` | Read | 200 |
| `POST` | Create | 201 |
| `PUT` | Update | 200 |
| `DELETE` | Delete | 204 |

## Files

### `pages.ts` → `pageController`

```ts
router.get('/',        pageController.list)
router.get('/:slug',   pageController.getBySlug)
router.get('/id/:id',  pageController.getById)
router.post('/',       pageController.create)
router.put('/:id',     pageController.update)
router.delete('/:id',  pageController.remove)
```

`:slug` and `:id` are **path parameters** → captured into `req.params`,
read later via `param()` / `numParam()`.

> ⚠️ **Route order gotcha:** `/:slug` is registered before `/id/:id`.
> Express matches in order, so `/api/pages/id/5` could be caught by `/:slug`
> with `slug = "id"`. Specific paths should always come *before* parameterized
> ones.

### `academics.ts` → `courseController`

```
GET    /courses        → list
GET    /courses/:id    → getById
POST   /courses        → create
PUT    /courses/:id    → update
DELETE /courses/:id    → remove
```

### `faculty.ts` → `facultyController`

Same 5-route CRUD pattern as academics, at the router root (`/`).

### `excellence.ts` → `facultyController`

Only 2 routes — read + create, no update/delete:

```ts
router.get('/',  facultyController.listExcellence)
router.post('/', facultyController.createExcellence)
```

Note it reuses `facultyController.ts` rather than having its own file.

### `admin.ts` — the odd one out

No controller, no service. It queries Drizzle **inline**:

```ts
const [pageCount] = await db.select({ count: sql<number>`count(*)::int` }).from(pages)
```

- `sql<number>`...`` — a **tagged template literal** for raw SQL, still safely
  parameterized by Drizzle.
- `::int` — casts Postgres `bigint` down to a JS number.

This breaks the route → controller → service pattern used everywhere else.
Inconsistent structure is a common smell — worth refactoring into a service.

## Connections

```
server.ts ──mounts──→ this folder
this folder ──imports──→ ../controllers/*
controllers ──imports──→ ../services/*
admin.ts ──imports──→ ../db/index.ts and ../db/schema.ts directly
```
