# `hooks/` — Reusable React logic

A React **hook** is a function that uses React features (state, effects) and
can be called inside components. The naming convention: always `useXxx`.

## `useApi.ts` — data fetching for the whole app

Two hooks, same shape — one for single resources, one for paginated lists:

```tsx
const { data, loading, error, refetch } = useApi<Course>('/academics/courses/11')

const { data, meta, loading, error, refetch } = useApiList<Course>('/academics/courses?page=2')
```

Pages normally don't call these directly — they use the typed wrappers in
`../api/hooks.ts`, which build the path with `../api/queryKeys.ts` and call
these two.

### State shape

```ts
interface UseApiState<T> {
  data: T | null        // ← generic: the caller decides the type
  loading: boolean
  error: Error | null   // ApiError (status/code) — not a string
}

interface UseApiListState<T> {
  data: T[]             // always an array (empty while loading/error)
  meta: ListMeta | null // page/limit/total/totalPages → <Pagination>
  loading: boolean
  error: Error | null
}
```

`error` is the actual `Error` (usually `ApiError`), so callers can check
`error instanceof ApiError && error.isNotFound` — `components/states.tsx`
does exactly that to turn 404s into the not-found page.

### The effect

```ts
useEffect(() => {
  let cancelled = false
  api.get<T>(path)
    .then((data) => { if (!cancelled) setState({ path, tick, data, loading: false, error: null }) })
    .catch((err: Error) => { if (!cancelled) setState({ path, tick, data: null, loading: false, error: err }) })
  return () => { cancelled = true }     // ← cleanup on unmount
}, [path, tick])
```

Three concepts to internalize:

1. **`useEffect(fn, [deps])`** — runs `fn` after render, and re-runs it when
   any dependency changes. Here: `path` (different endpoint/params) or
   `tick` (a refetch was requested).
2. **The `cancelled` flag** — if the component unmounts (user navigates away)
   before the response arrives, calling `setState` would warn. The cleanup
   sets `cancelled = true`, and the callbacks check it. This is the standard
   async-in-effect pattern.
3. **Freshness check instead of a loading flag** — state stores the `path`
   and `tick` it was fetched for:

   ```ts
   // useApi (single resource)
   const current = state.path === path && (state.tick === tick || state.data !== null) ? state : freshState(path, tick)
   // useApiList — same idea with meta as the "have data" marker
   const current = state.path === path && (state.tick === tick || state.meta !== null) ? state : freshListState(path, tick)
   ```

   When `path` changes (e.g. new search param), the hook *immediately*
   reports `{ data: null, loading: true }` without a second `setState` in an
   effect — so the UI never shows stale data from the previous path, and
   there's no render-after-fetch flash.

   When only `tick` changes (a background refetch — user hit "Try again" or a
   SSE content event arrived), existing `data`/`meta` is **kept on screen**
   (stale-while-revalidate): `loading` stays `false` and a failed background
   refresh falls back to the last good payload instead of blanking the page.

### Live refresh (SSE)

Both hooks share a `useRefresh()` helper that subscribes once to
`api/contentEvents.ts` (`subscribeContentEvents`) and bumps `tick` when the
server broadcasts a content event from an admin mutation — so an edit made
in another tab shows up on this page within ~1 s without a reload. Unmount
unsubscribes; the shared `EventSource` closes when the last subscriber
leaves.

### `refetch`

```ts
function useRefresh(): { tick: number; refetch: () => void } {
  const [tick, setTick] = useState(0)
  useEffect(() => subscribeContentEvents(() => setTick((t) => t + 1)), [])
  const refetch = useCallback(() => setTick((t) => t + 1), [])
  return { tick, refetch }
}
```

Instead of re-implementing the fetch, `refetch` bumps `tick` — which is in the
dependency array — so the effect runs again. `useCallback(fn, [])` keeps the
reference stable between renders.

### Return

```ts
return { data, loading, error, refetch }           // useApi
return { data, meta, loading, error, refetch }     // useApiList
```

## Consumers

| Consumer | Call |
| --- | --- |
| `api/hooks.ts` | every typed public hook (`usePageBySlug`, `useCourseList`, …) |
| `pages/Departments.tsx` | `useStreamList` (list + meta → Pagination) |
| `admin/Dashboard.tsx` | `useApi<AdminStats>('/admin/stats')` etc. |
| `admin/PageEditor.tsx`, `admin/CourseEditor.tsx` | `useApi` for edit-mode loads |

Hooks are per-call, not per-component — `Departments` calls one list hook and
`useAllStreams` (another list hook) without conflict.

## Typical usage pattern

```tsx
const { data, loading, error, refetch } = useCourseById(id)

if (loading) return <Loading />
if (error)   return <ErrorState error={error} onRetry={refetch} />
if (!data)   return null
```

Or via typed hooks (preferred in pages):

```tsx
const { data: streams, meta, loading, error, refetch } = useStreamList({ q, category, page, limit: 9 })
```

## Connections

```
THIS FOLDER ──imports──→ ../api/client.ts   (api.get / api.list)
THIS FOLDER ──used by──→ ../api/hooks.ts, ../pages/*, ../admin/*
pages ──also import──→ ../api/types, ../components/states
```
