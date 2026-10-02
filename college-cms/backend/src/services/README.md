# `services/` — Database operations (the CRUD layer)

Services own all database access. They receive plain values, return rows, and
throw `HttpError` when something's wrong.

**Key rule: services know nothing about HTTP.** No `req`, no `res`, no status
codes. That's what makes them reusable and unit-testable.

## The template (using `courseService.ts`)

### List (with filters, search, sort, pagination)

```ts
export const courseSortColumns = { code: courses.code, title: courses.title, ... }

export async function listCourses(query: ListQuery): Promise<{ rows: Course[]; total: number }> {
  const where = [query.active ? eq(courses.isActive, true) : undefined, ...]
  const total = await db.select({ count: sql<number>`count(*)::int` }).from(courses).where(and(...where))
  const rows = await db.select().from(courses)
    .where(and(...where))
    .orderBy(sortDirection(query.sort, query.order, courseSortColumns))
    .limit(query.limit).offset((query.page - 1) * query.limit)
  return { rows, total }
}
```

- `active: true` is passed by **public** controllers (visibility rule);
  admin lists pass it only when `?active=` was supplied.
- Search uses `likePattern` (`like.ts`) — `ilike` with `%`/`_`/`\` escaped so
  user input can't change the pattern's meaning. Values are still
  parameterized by Drizzle → immune to SQL injection.
- `total` is cast `count(*)::int` because Postgres `bigint` arrives as a
  JS bigint-ish string.

### Read one (visibility + clean 404)

```ts
const [row] = await db.select().from(courses).where(and(eq(courses.id, id), visible)).limit(1)
if (!row) throw new HttpError(404, 'Course not found', 'not_found')
```

`visible` differs per controller call: public reads add the visibility
fragment, admin reads don't (they can see drafts/inactive rows).

### Create / update / delete

```ts
const [row] = await db.insert(courses).values(input).returning()   // 201
await getCourseRow(id, false)                                      // existence → 404
const [row] = await db.update(courses).set(input).where(...).returning()
await db.delete(courses).where(...)                                // controller responds 204
```

Unique-slug collisions and FK violations are **not** pre-checked with a
SELECT — the INSERT/UPDATE is allowed to fail, and
`middleware/error.ts` maps the Postgres constraint (`courses_slug_unique`
→ 409, FK → 400 `invalid_reference`). Deletes that must answer "why" use
explicit in-use pre-checks → 409 (`courseService.deleteCourse`).

## Visibility fragments

Public list/detail queries append these (raw `sql` templates so they compose):

| Resource | Fragment |
| --- | --- |
| pages / page blocks | `published = true` |
| streams, courses, degree levels, excellence, domains | `is_active = true` |
| faculty | `stream_id is null or stream is active` (`facultyService.streamVisible`) |
| excellence items | `domain_id is null or domain is active` (`excellenceService.domainVisible`) |

Details endpoints (`academicService.getPublicDetails`) throw 404 when the
stream is missing or inactive.

> ⚠️ Inside `` sql`...` `` templates, reference Drizzle columns with
> interpolation (`${streams.isActive}`) — hand-written camelCase
> (`streams.isActive` as literal SQL) will crash at query time because the
> real column is `is_active`.

## Reorder

`reorder.ts` → `assertPermutation(requestedIds, existingIds, resource)`:

- requested ids must be **every** existing id exactly once
- otherwise → 400 `validation_error` with `details`
  (`unknown id` / `missing ids` / `duplicate id`)
- on success, positions are assigned `index * 10` in one transaction

Used by streams, degree levels, pages (top level + blocks), excellence.

## Multi-table writes run in transactions

`pageService.createPage` / `updatePage` (page + blocks + gallery items),
`facultyService.createFaculty` (member + details), and reorders all use
`db.transaction(...)` so a partial failure rolls everything back.

## Files

| File | Table(s) |
| --- | --- |
| `pageService.ts` | `pages`, `page_blocks`, `page_block_gallery_items` (+ media join) |
| `streamService.ts` | `streams`, `academic_details`, `faculty_details` (stream-level) |
| `courseService.ts` | `courses` (+ stream/degree existence + composite FK checks) |
| `degreeLevelService.ts` | `degree_levels`, `degree_level_streams` |
| `facultyService.ts` | `faculty_members`, `faculty_details` |
| `excellenceService.ts` | `excellence`, `excellence_domains` |
| `contactService.ts` | `college_contact` (singleton upsert) |
| `academicService.ts` | public academic details |
| `statsService.ts` | dashboard counts |
| `like.ts` | `likeEscape` / `likePattern` helpers |
| `reorder.ts` | `assertPermutation` |

## Connections

```
controllers/*.ts ──imports──→ THIS FOLDER
THIS FOLDER ──imports──→ ../db/index.ts        (db)
THIS FOLDER ──imports──→ ../db/tables/*        (schema + row types)
THIS FOLDER ──imports──→ ../middleware/error.ts (HttpError)
```

## Where a 404 actually becomes a response

```
service throws HttpError(404, 'Course not found', 'not_found')
  → Express catches the rejection
  → middleware/error.ts errorHandler
  → res.status(404).json({ error: { code: 'not_found', message: '...' } })
```
