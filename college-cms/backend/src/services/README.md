# `services/` — Database operations (the CRUD layer)

Services own all database access. They receive plain values, return rows, and
throw `HttpError` when something's wrong.

**Key rule: services know nothing about HTTP.** No `req`, no `res`, no status
codes. That's what makes them reusable and unit-testable.

Every file in here follows the **identical 5-function template** — understand
one and you know all of them.

## The template (using `courseService.ts`)

### Read all — lines 6-8

```ts
export async function listCourses(): Promise<Course[]> {
  return db.select().from(courses).orderBy(asc(courses.code))
}
```

Drizzle builds: `SELECT * FROM courses ORDER BY code ASC`

### Read one — lines 10-14

```ts
const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1)
if (!course) throw new HttpError(404, `Course ${id} not found`)
return course
```

- Drizzle returns an **array**; destructuring `const [course]` grabs the first
  row — `undefined` if nothing matched.
- The `if (!course)` → `throw new HttpError(404, ...)` is how "not found"
  becomes a JSON 404 response (caught later by `errorHandler`).

### Create — lines 16-19

```ts
const [course] = await db.insert(courses).values(input).returning()
```

`.returning()` — Postgres-specific: returns the inserted row in the same
round-trip instead of needing a second SELECT.

### Update — lines 21-25

```ts
await getCourse(id)              // ← existence check first → clean 404
const [course] = await db.update(courses).set(input).where(eq(courses.id, id)).returning()
```

Input is `Partial<NewCourse>` — **every field optional**, so callers can
update a subset (the controller builds that subset with the spread trick).

### Delete — lines 27-30

```ts
await getCourse(id)              // ← existence check → 404 instead of silent no-op
await db.delete(courses).where(eq(courses.id, id))
```

Returns `Promise<void>` — the controller responds `204`.

## Drizzle operators you'll see

Imported from `drizzle-orm`:

| Helper | SQL | Used for |
| --- | --- | --- |
| `eq(a, b)` | `a = b` | `WHERE id = 7` |
| `asc(col)` | `ORDER BY col ASC` | sorting |

Drizzle **parameterizes** every value automatically → immune to SQL injection.
Never string-concatenate user input into SQL.

## Files

| File | Table(s) | List order |
| --- | --- | --- |
| `pageService.ts` | `pages` | `id` ascending |
| `courseService.ts` | `courses` | `code` ascending |
| `facultyService.ts` | `faculty` **and** `excellence` | `name` / `year` ascending |

`facultyService.ts` is slightly bigger — it holds CRUD for `faculty` plus two
extra functions for the `excellence` table (`listExcellence`,
`createExcellence`), because `routes/excellence.ts` reuses this controller.

## Exports used by controllers

| Service | Functions |
| --- | --- |
| `pageService` | `listPages`, `getPageBySlug`, `getPageById`, `createPage`, `updatePage`, `deletePage` |
| `courseService` | `listCourses`, `getCourse`, `createCourse`, `updateCourse`, `deleteCourse` |
| `facultyService` | `listFaculty`, `getFaculty`, `createFaculty`, `updateFaculty`, `deleteFaculty`, `listExcellence`, `createExcellence` |

Note `getPageBySlug` / `getPageById` are exported because `pageController`
exposes two different read routes.

## Connections

```
controllers/*.ts ──imports──→ THIS FOLDER
THIS FOLDER ──imports──→ ../db/index.ts        (db)
THIS FOLDER ──imports──→ ../db/schema.ts       (tables + types: Page, NewPage, Course...)
THIS FOLDER ──imports──→ ../middleware/error.ts (HttpError)
```

`routes/admin.ts` skips this folder entirely and queries `db` directly.

## Where a 404 actually becomes a response

```
service throws HttpError(404, "Course 7 not found")
  → Express catches it (async rejection propagates)
  → middleware/error.ts errorHandler
  → res.status(404).json({ error: "Course 7 not found" })
```
