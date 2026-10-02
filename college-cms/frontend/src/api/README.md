# `api/` — HTTP client, contract types, query keys, typed hooks

The **only** place in the frontend that knows how to talk to the backend.
Pages never build URLs by hand — they call the typed hooks in `hooks.ts`
which use `queryKeys.ts` + `client.ts`.

## `client.ts` — the fetch wrapper

### Base URL

```ts
const BASE = '/api'
```

Relative path — no `http://localhost:4000` hardcoded. Vite's dev proxy
(`vite.config.ts`) forwards `/api/*` to the backend in development; in
production your web server does the same.

### `ApiError` — every failure becomes an exception

```ts
class ApiError extends Error {
  status: number              // 0 = network failure (fetch threw)
  code: ApiErrorCode          // 'not_found' | 'validation_error' | ...
  details?: ErrorDetail[]     // per-field validation messages
  get isNotFound(): boolean   // status === 404
  get isRetryable(): boolean  // 5xx or network
}
```

`fetch` does **not** reject on 404/500 — only on network failure. The client
checks `res.ok` and throws `ApiError`, so pages always get exceptions instead
of silently rendering `undefined`. A fetch that throws (backend down) becomes
`ApiError(0, 'network_error', ...)`.

### Envelope handling

The backend wraps responses:

```jsonc
{ "data": { ... } }                                  // single resource
{ "data": [...], "meta": { page, limit, total, totalPages } }   // lists
204 No Content                                       // deletes (→ undefined)
{ "error": { "code", "message", "details?" } }       // errors
```

- `api.get/post/put/delete` **unwrap** `body.data` — callers receive the
  resource directly.
- `api.list` validates that `data` is an array and returns `{ data, meta }`
  — `meta` powers pagination components.
- `res.status === 204` → `undefined` (no JSON to parse).

### Exported helpers

```ts
api.get<T>(path)                    // unwrap single resource
api.list<T>(path)                   // { data: T[], meta: ListMeta }
api.post<T>(path, body)             // JSON.stringify + Content-Type
api.put<T>(path, body)
api.delete<T>(path)
```

`JSON.stringify(body)` pairs with `Content-Type: application/json` and the
backend's `express.json()` middleware.

### Auth header + 401 handling

```ts
setAuthToken(token | null)           // module-level bearer token (admin login sets this)
getAuthToken()
setUnauthorizedHandler(fn | null)    // called once when a request 401s WITH a token set
```

`request()` adds `Authorization: Bearer <token>` to every call when a token is
set, and fires the unauthorized handler on a `401` **before** throwing — the
admin `AuthProvider` uses it to clear the in-memory session (frontend
`src/admin/session.ts`). The token is never persisted to storage.

## `queryClient.ts` — TanStack Query defaults

```ts
createQueryClient()  // retry: never for ApiError, ≤2 for network flukes;
                     // staleTime 30s; no refetch-on-focus; mutations never retry
```

Admin screens use TanStack Query; the public read side still uses
`useApi`/`useApiList`. Tests build their own client with this factory so
validation failures don't retry into timeouts.

## `queryKeys.ts` — one factory for every request path

```ts
export const queryKeys = {
  pages: (params) => `/pages${query(params)}`,
  pageBySlug: (slug) => `/pages/${encodeURIComponent(slug)}`,
  streams: (params & { category }) => `/streams${query(params)}`,
  courses: (params & { stream, degreeLevelId }) => `/academics/courses${query(params)}`,
  ...
}
```

- Every key is the **exact path** the backend serves — no URL drift.
- `query(params)` serializes `{ page, limit, q, sort, order, ... }` and drops
  empty/null values, so keys are stable and comparable.
- `encodeURIComponent` on all path params (slugs, ids).

### `adminKeys` — TanStack Query keys for the CMS

```ts
adminKeys.stats()                        // ['admin','stats']
adminKeys.pages.of(params) / .root       // ['admin','pages',params] / ['admin','pages']
adminKeys.page(id)                       // ['admin','page',id]
adminKeys.stream(id) / adminKeys.streams.root / .of(params)
adminKeys.courses / course / degreeLevels / degreeLevel
adminKeys.faculty / facultyMember / excellence / excellenceItem
adminKeys.excellenceDomains / excellenceDomain / media / mediaItem / contact
```

`.root` exists for **narrow prefix invalidation**: saving a page invalidates
`adminKeys.pages.root` + `adminKeys.page(id)` + `stats` and touches nothing
else (asserted in `src/admin/pages.test.tsx`).

## `hooks.ts` — typed hooks on top of `useApi`

| Hook | Request |
| --- | --- |
| `usePageBySlug(slug)` | `GET /pages/:slug` |
| `useStreamList(params)` / `useAllStreams()` | `GET /streams` (list) |
| `useStreamBySlug(slug)` | `GET /streams/:slug` |
| `useDegreeLevelList(params)` | `GET /degree-levels` |
| `useCourseList(params)` / `useCourseById(id)` | `GET /academics/courses[...]` |
| `useAcademicDetails(streamSlug)` | `GET /academics/details/:slug` |
| `useFacultyList(params)` / `useFacultyById(id)` | `GET /faculty[...]` |
| `useExcellenceList(params)` | `GET /excellence` |
| `useExcellenceDomains()` / `useExcellenceDomain(slug)` | `GET /excellence-domains[...]` |
| `useContact()` | `GET /contact` |

Each hook is a thin wrapper: build path via `queryKeys`, call `useApi` or
`useApiList` (see `../hooks/useApi.ts`), return the result typed.

## `types.ts` — the contract with the backend

Hand-written mirrors of the backend API (see `../../backend/src/db/tables/`):

| Type | Backend source |
| --- | --- |
| `Envelope` / `ListEnvelope` / `ListMeta` / `ErrorBody` / `ApiErrorCode` | response envelopes |
| `PageListItem` / `PageWithBlocks` / `BlockView` / `PageBlockType` | pages + block views |
| `MediaRef` | media |
| `Stream` / `StreamWithLevels` / `DegreeLevel` | streams + degree levels |
| `Course` | courses |
| `FacultyMember` | faculty |
| `ExcellenceDomain` / `ExcellenceItem` | excellence |
| `CollegeContact` / `AcademicDetails` / `AdminStats` | contact, academic details, admin stats |
| `Media` / `MediaRef` | media library rows (URL-referenced images) |
| `BlockInput` | validated block payload for admin create/update |
| `DegreeLevelWithStreams` / `FacultyDetailsResponse` | admin degree-level + stream faculty intro views |
| `RichDoc` / `RichNode` / `RichTextRun` / ... | RichDoc JSON nodes (paragraph/heading/list) |

`BlockView` is a **discriminated union** on `type`
(`heading | paragraph | list | image | gallery | ...`) with per-type `content`
— so block renderers are exhaustively type-checked.

> ⚠️ **Duplication risk:** these types are hand-written to match the backend.
> A schema change on either side breaks the contract at typecheck time if
> you're lucky, silently if not. Professional teams generate these from
> OpenAPI instead.

## Who uses this folder

| Consumer | How |
| --- | --- |
| `hooks/useApi.ts` | `api.get` / `api.list` with a `queryKeys` path |
| every public page | typed hooks from `hooks.ts` |
| all `admin/*` managers/editors | `useQuery` with `adminKeys` + `api.post/put/delete` from mutations |
| `admin/session.ts` | `api.get('/admin/whoami')` on login; `setAuthToken`/`setUnauthorizedHandler` |
| `tests/client.test.ts` | asserts unwrap/meta/error behavior |
