# `hooks/` — Reusable React logic

A React **hook** is a function that uses React features (state, effects) and
can be called inside components. The naming convention: always `useXxx`.

## `useApi.ts` — data fetching in one line

```tsx
const { data, loading, error, refetch } = useApi<Course[]>('/academics/courses')
```

This single hook replaces the same three-state boilerplate in every page.
It calls `api.get` from `../api/client.ts`.

### State shape (lines 4-8, 11-15)

```ts
interface UseApiState<T> {
  data: T | null        // ← generic: the caller decides the type
  loading: boolean
  error: string | null
}
```

- **`<T>`** — generic type parameter. `useApi<Course[]>` means
  `data` is typed `Course[] | null` inside that component.
- Initial value is `{ data: null, loading: true, error: null }` — loading
  starts `true` because a request is about to happen.

### The effect (lines 18-31)

```ts
useEffect(() => {
  let cancelled = false
  api.get<T>(path)
    .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }) })
    .catch((err: Error) => { if (!cancelled) setState({ data: null, loading: false, error: err.message }) })
  return () => { cancelled = true }     // ← cleanup on unmount
}, [path, tick])
```

Three concepts to internalize:

1. **`useEffect(fn, [deps])`** — runs `fn` after render, and re-runs it when
   any value in the dependency array changes. Here: when `path` changes
   (different endpoint) or `tick` changes (a refetch was requested).
2. **The `cancelled` flag** — if the component unmounts (user navigates away)
   before the response arrives, calling `setState` would trigger
   *"Can't perform a React state update on an unmounted component."* The
   cleanup function sets `cancelled = true`, and the callbacks check it.
   This is the standard async-in-effect pattern.
3. **`.then` / `.catch`** — resolves into success state or error state, so
   the component always gets one of the three.

### `refetch` (lines 33-36)

```ts
const refetch = useCallback(() => {
  setState((s) => ({ ...s, loading: true, error: null }))
  setTick((t) => t + 1)
}, [])
```

Instead of re-implementing the fetch, it bumps `tick` — which is in the
dependency array — so the effect runs again. Returning `loading: true`
immediately gives the UI a spinner while the new request is in flight.

- **`useCallback(fn, [])`** — memoizes the function so its reference stays
  stable between renders (prevents needless effect re-runs in children).

### Return (line 38)

```ts
return { ...state, refetch }
```

Spreads `{ data, loading, error }` and adds `refetch`.

## Consumers

| Component | Call |
| --- | --- |
| `pages/Home.tsx` | `useApi<Page>('/pages/home')` |
| `pages/Academics.tsx` | `useApi<Course[]>('/academics/courses')` |
| `pages/Faculty.tsx` | `useApi<FacultyMember[]>('/faculty')` |
| `pages/DynamicPage.tsx` | `useApi<Page>(`/pages/${slug}`)` |
| `admin/Dashboard.tsx` | `useApi<Stats>('/admin/stats')` **and** `useApi<Page[]>('/pages')` |

`Dashboard` calls the hook twice — two independent requests, two independent
states. That's allowed; hooks are per-call, not per-component.

## Typical usage pattern

```tsx
const { data, loading, error } = useApi<Course[]>('/academics/courses')

if (loading) return <p>Loading courses...</p>
if (error)   return <p className="error">{error}</p>
// here, data is guaranteed non-null (unless empty response)
```

## Connections

```
THIS FOLDER ──imports──→ ../api/client.ts   (api.get)
THIS FOLDER ──used by──→ ../pages/*, ../admin/*
pages/admin ──also import──→ ../api/types    (for the <T> argument)
```
