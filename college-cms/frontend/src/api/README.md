# `api/` — HTTP client and shared types

The **only** place in the frontend that knows how to talk to the backend.
Everything else calls `api.get/post/put/delete`.

## `client.ts` — the fetch wrapper

### Base URL

```ts
const BASE = '/api'
```

Relative path — no `http://localhost:4000` hardcoded. Vite's dev proxy
(`vite.config.ts`) forwards `/api/*` to the backend in development; in
production your web server does the same.

### Core function

```ts
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,                                  // method, body spread in
  })
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`)  // ← 404/500 become exceptions
  }
  return res.json() as Promise<T>
}
```

Key points for a beginner:

- **`fetch`** — the browser's built-in HTTP client (no library needed).
- **`<T>` generic** — the *caller* decides what type comes back:
  `api.get<Course[]>('/academics/courses')` → `Course[]`.
  The function can't actually verify it — `as Promise<T>` is a type-level
  promise that the shape matches. That's why `types.ts` must stay in sync
  with the backend schema.
- **`if (!res.ok) throw`** — this is critical. `fetch` does *not* reject on
  404/500; it only rejects on network failure. Without this check, errors
  would silently render as `undefined`.

### Exported helpers

```ts
export const api = {
  get:    <T>(path)          => request<T>(path),
  post:   <T>(path, body)    => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    <T>(path, body)    => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  delete: <T>(path)          => request<T>(path, { method: 'DELETE' }),
}
```

`JSON.stringify(body)` — the object must be serialized, and it pairs with
`Content-Type: application/json` + the backend's `express.json()` middleware.

## `types.ts` — the contract with the backend

Mirror images of the Drizzle schema in `../backend/src/db/schema.ts`:

| Interface | Backend table |
| --- | --- |
| `Page` | `pages` |
| `Course` | `courses` |
| `FacultyMember` | `faculty` |
| `ExcellenceItem` | `excellence` |
| `ContentBlockData` | `pages.blocks` (jsonb array items) |

```ts
export interface ContentBlockData {
  id: string
  type: 'heading' | 'paragraph' | 'image' | 'list'   // union — only these 4 values allowed
  content: string
}
```

`'a' | 'b' | 'c'` is a **string literal union**: TypeScript rejects any other
value, so a typo like `'headin'` fails at compile time.

> ⚠️ **Duplication risk:** these types are hand-written to match the backend.
> A schema change on either side breaks the contract silently. Professional
> teams generate these from OpenAPI/Zod instead of maintaining by hand.

## Who uses this folder

| Consumer | How |
| --- | --- |
| `hooks/useApi.ts` | `api.get<T>(path)` |
| `admin/PageEditor.tsx` | `api.post` / `api.put` on save |
| `admin/CourseEditor.tsx` | `api.post` / `api.put` on save |
| every page/component | imports types from `types.ts` |
