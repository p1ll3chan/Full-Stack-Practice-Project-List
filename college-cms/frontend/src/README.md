# `src/` — Application source

Everything React lives here. `main.tsx` is the entry point; `App.tsx` decides
what renders.

## Bootstrap chain

```
index.html  <div id="root"></div>
    ↓
main.tsx    createRoot(...).render(<StrictMode><App /></StrictMode>)
    ↓
App.tsx     <BrowserRouter> → Header + Routes + Footer
    ↓
match URL → render the matching page component
```

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

### `App.tsx` — the router

```tsx
<BrowserRouter>
  <Header />
  <main className="container">
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/academics" element={<Academics />} />
      <Route path="/faculty" element={<Faculty />} />
      <Route path="/admin" element={<Dashboard />} />
      <Route path="/admin/pages/new" element={<AdminNewPage />} />
      <Route path="/admin/courses/new" element={<AdminNewCourse />} />
      <Route path="/:slug" element={<DynamicPage />} />   // ⚠️ catch-all
    </Routes>
  </main>
  <Footer />
</BrowserRouter>
```

- `<BrowserRouter>` — enables URL-based routing (HTML5 History API).
- `<Routes>` / `<Route>` — maps a path to a component.
- **Route order matters:** `/:slug` is last, so `/admin` and `/academics`
  win before the wildcard claims them.
- `AdminNewPage` / `AdminNewCourse` are tiny wrappers (lines 12-18) so the
  same `PageEditor` / `CourseEditor` components can be reused for "new" —
  they're called without props, which means create mode.

## Files

| File | Role |
| --- | --- |
| `main.tsx` | Mounts React into `#root`, imports global CSS |
| `App.tsx` | All routes + shared Header/Footer layout |
| `index.css` | Every stylesheet in the app (single file) |

## Folders (each has its own README)

| Folder | Job |
| --- | --- |
| `api/` | `fetch` wrapper + shared TypeScript types |
| `hooks/` | `useApi` — reusable data-fetching hook |
| `components/` | Reusable UI pieces (Header, Footer, cards) |
| `pages/` | Public pages, one per route |
| `admin/` | Dashboard + editors that write to the API |
| `assets/` | Images imported into components |

## Shared conventions

- **Function components only** — `export default function X() {...}`
- **Type-only imports** for shapes: `import type { Course } from '../api/types'`
- **`key={item.id}`** on every `.map()` render — React needs stable keys
- **Early returns** for loading/error before rendering the real UI:
  ```tsx
  if (loading) return <p>Loading...</p>
  if (error) return <p className="error">...</p>
  ```
- Styling via `className` strings; all CSS lives in `index.css`
