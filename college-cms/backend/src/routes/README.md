# `routes/` — URL → controller mapping

**Deliberately thin.** A route file contains no logic, no validation, no
queries — only "this URL + this HTTP method calls this function."

Two kinds of routers:

- **`routes/*.ts` — public, read-only.** Only `GET`. Mounted straight on `app`.
- **`routes/admin/*` — authenticated, mutating.** Mounted once:

```ts
app.use('/api/admin', authenticate, requireRole('editor'), adminRouter)
```

Every admin URL therefore passes `authenticate` (bearer token → `req.auth`)
and `requireRole('editor')` before any handler runs. Individual `DELETE`
handlers add `requireRole('admin')` inline.

Final URL = **mount prefix + route path**. Example:
`routes/admin/courses.ts` has `router.post('/', ...)` mounted at
`/api/admin` (via the admin index) → `POST /api/admin/courses`.

## HTTP verbs → CRUD

| Verb | Action | Success code |
| --- | --- | --- |
| `GET` | Read | 200 |
| `POST` | Create | 201 |
| `PUT` | Update / reorder | 200 |
| `DELETE` | Delete | 204 |

## Files

### Public (`GET` only)

| File | Paths |
| --- | --- |
| `pages.ts` | `/api/pages`, `/api/pages/:slug` |
| `streams.ts` | `/api/streams`, `/api/streams/:slug` |
| `academics.ts` | `/api/academics/courses`, `/api/academics/courses/:id`, `/api/academics/details/:streamSlug` |
| `faculty.ts` | `/api/faculty`, `/api/faculty/:id` |
| `excellence.ts` | `/api/excellence`, `/api/excellence/:id` |
| `excellenceDomains.ts` | `/api/excellence-domains`, `/api/excellence-domains/:slug` |
| `degreeLevels.ts` | `/api/degree-levels`, `/api/degree-levels/:code` |
| `contact.ts` | `/api/contact` |

Public routers expose no mutations. Old write URLs (`POST /api/pages`, etc.)
now fall through to `notFound` (404) — frontend writes must move to
`/api/admin/*` with a bearer token (Phase 3).

### `routes/admin/index.ts`

Assembles the admin router from the files below and exports it. Order and
path specificity matter (see gotchas).

| File | Paths (all under `/api/admin`) |
| --- | --- |
| `pages.ts` | pages CRUD, `/:id/publish`, `/:id/unpublish`, `/:id/blocks` CRUD, `/:id/blocks/order`, `PUT /order` |
| `streams.ts` | streams CRUD, `/:id/active`, `GET/PUT /:id/details` (academic), `GET/PUT /:id/faculty-details`, `PUT /order` |
| `courses.ts` | courses CRUD |
| `degreeLevels.ts` | degree levels CRUD, `PUT /order` |
| `faculty.ts` | faculty CRUD, `/:id/details` upsert |
| `excellence.ts` | items CRUD, `PUT /order` |
| `excellenceDomains.ts` | domains CRUD |
| `contact.ts` | `GET /` (404 if unset), `PUT /` (upsert) |
| `stats` (in index) | `GET /stats` → counts for the admin dashboard |

`GET /api/admin/stats` now has a proper controller
(`adminController` → `statsService`) instead of the old inline query.

## Gotchas

> ⚠️ **Route order.** Express matches in registration order:
>
> - `PUT /order` must be registered **before** `PUT /:id`, or `order` is
>   parsed as an id and fails validation.
> - `/:id/blocks/order` must come **before** `/:id/blocks/:blockId`, or a
>   reorder PUT is mistaken for a block update.
>
> Same rule as always: specific paths go before parameterized ones.

Path ids are validated by zod (`pathId` in `src/http/query.ts`) inside the
controller — `/api/admin/pages/abc` → 400 `validation_error`, never a crash
or a raw SQL error.

## Connections

```
app.ts ──mounts──→ this folder (public + routes/admin/index.ts)
routes/*.ts ──imports──→ ../controllers/*
routes/admin/* ──imports──→ ../../controllers/*  (auth applied by app.ts mount)
controllers ──imports──→ ../services/*
```
