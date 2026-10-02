# `src/` — Application source

Everything React lives here. `main.tsx` is the entry point; `App.tsx` provides
the router shell; `routes.tsx` owns the route table.

## Bootstrap chain

```
index.html  <div id="root"></div>
    ↓
main.tsx    createRoot(...).render(<StrictMode><App /></StrictMode>)
    ↓
App.tsx     <QueryClientProvider> → <AuthProvider> → <BrowserRouter>
            → Header + <AppRoutes /> + Footer
    ↓
routes.tsx  match URL → render the matching page component
            (/admin/* nested under RequireAuth → AdminLayout)
```

`AuthProvider` (`admin/auth.tsx`) keeps the bearer token in memory and wires
the client's `setUnauthorizedHandler` to sign out on a `401`. Providers are in
`App.tsx` so tests can render `<AppRoutes />` with their own wrappers.

### `main.tsx` (10 lines)

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- `createRoot` — React 19's entry point (replaces the old `ReactDOM.render`).
- `!` — non-null assertion: "trust me, `#root` exists" (it's in `index.html`).
- `<StrictMode>` — development helper that double-invokes effects to surface
  bugs (e.g. missing cleanup).
- `import './index.css'` — importing CSS makes Vite bundle it.

### `App.tsx` — the router shell

```tsx
<QueryClientProvider>
  <ContentSync />           {/* SSE → invalidate ['admin'] queries */}
  <AuthProvider>
    <a className="skip-link" href="#main">Skip to content</a>
    <Header />
    <main id="main" className="container">
      <AppRoutes />
    </main>
    <Footer />
  </AuthProvider>
</QueryClientProvider>
```

`App.tsx` intentionally contains **no routes** — they live in `routes.tsx`
so tests can render `<AppRoutes />` inside a `MemoryRouter` without a real
`BrowserRouter`. It also owns the skip link + `#main` landmark and mounts
`admin/ContentSync.tsx` (the admin side of SSE live refresh).

### `routes.tsx` — the route table

| Path | Page | Data |
| --- | --- | --- |
| `/` | `Home` | `GET /api/pages/home` + stream preview |
| `/about` | `About` | `GET /api/pages/about` |
| `/contact` | `Contact` | `GET /api/pages/contact` + `GET /api/contact` |
| `/departments` | `Departments` | `GET /api/streams` (search, category, pagination) |
| `/departments/:slug` | `DepartmentDetail` | `GET /api/streams/:slug` + degree levels + courses |
| `/streams/:slug` | `DepartmentDetail` | alias of the above (backend stream source path) |
| `/academics` | `Academics` | `GET /api/pages/academics` + degree levels + all courses |
| `/academics/streams/:slug` | `AcademicDetail` | `GET /api/academics/details/:slug` + shared nav |
| `/academics/courses/:id` | `CourseDetail` | `GET /api/academics/courses/:id` |
| `/faculty` | `Faculty` | `GET /api/faculty` |
| `/faculty/streams/:slug` | `FacultyStream` | members + courses for one stream |
| `/faculty/:id` | `FacultyDetail` | `GET /api/faculty/:id` |
| `/excellence` | `Excellence` | domains + items |
| `/excellence/domains/:slug` | `ExcellenceDomain` | `GET /api/excellence-domains/:slug` + items |
| `/admin/login` | `LoginPage` (outside guard) | `GET /admin/whoami` |
| `/admin` → `/admin/pages`, `/departments`, `/academics/...`, `/faculty`, `/excellence`, `/media`, `/contact` | CMS screens under `RequireAuth` → `AdminLayout` | admin API via TanStack Query |
| `/:slug` | `DynamicPage` | `GET /api/pages/:slug` — CMS catch-all |
| `*` | `NotFound` | not-found test page |

**Route order matters:** static paths first, `/:slug` catch-all second to
last, `*` (NotFound) last — so `/academics` and `/admin` win before the
wildcards claim them. The `/admin` branch uses nested routes: one
`<Route element={<RequireAuth/>}>` guards every screen, with a second
`<Route element={<AdminLayout/>}>` inside adding sidebar + topbar; login
lives outside both.

## Files

| File | Role |
| --- | --- |
| `main.tsx` | Mounts React into `#root`, imports global CSS |
| `App.tsx` | BrowserRouter + Header/Footer layout wrapper |
| `routes.tsx` | The full route table (`AppRoutes`, used by pages *and* tests) |
| `index.css` | Every stylesheet in the app (single file) |

## Folders (each has its own README)

| Folder | Job |
| --- | --- |
| `api/` | fetch client, contract types, query keys, typed hooks |
| `hooks/` | `useApi` / `useApiList` — reusable data-fetching hooks |
| `components/` | Reusable UI (Header, states, block registry, cards, nav) |
| `pages/` | Public pages, one per route |
| `admin/` | Authenticated CMS: session/guard, layout, managers + editors (see `admin/README.md`) |
| `tests/` | vitest suites for client, blocks, cards, routes, listings |
| `assets/` | Images imported into components |

## Shared conventions

- **Function components only** — `export default function X() {...}`
- **Type-only imports** for shapes: `import type { Course } from '../api/types'`
  (enforced by `verbatimModuleSyntax`)
- **No comments in source** (project rule)
- **`key={item.id}`** on every `.map()` render — React needs stable keys
- **Centralized data fetching** — pages call typed hooks from `api/hooks.ts`;
  every request path comes from `api/queryKeys.ts` (never hand-built URLs)
- **Shared async states** — `components/states.tsx` provides `Loading`,
  `ErrorState` (with retry + 404 → not-found), `EmptyState`, `NotFoundPage`
- **Never `dangerouslySetInnerHTML`** — CMS text renders as React children;
  links/colors are sanitized in `components/RichText.tsx`
- Styling via `className` strings; all CSS lives in `index.css`
- **Two data layers** — public pages: `useApi`/`useApiList` (fetch per mount);
  admin screens: TanStack Query with keys from `api/queryKeys.ts` and narrow
  invalidation after each mutation
- **No comments in admin either** — exception: CSS section banners in
  `index.css` (`/* ---------- Phase 4 additions ---------- */`)
