# `pages/` — Public-facing routes

One component per route, registered in `../App.tsx`:

| File | Route | Data source |
| --- | --- | --- |
| `Home.tsx` | `/` | `GET /api/pages/home` |
| `Academics.tsx` | `/academics` | `GET /api/academics/courses` |
| `Faculty.tsx` | `/faculty` | `GET /api/faculty` |
| `DynamicPage.tsx` | `/:slug` (catch-all) | `GET /api/pages/:slug` |

All four use the `useApi` hook (`../hooks/useApi.ts`) — read-only pages, no
forms. Writes happen in `../admin/`.

## The universal pattern

Every page follows this exact skeleton:

```tsx
export default function X() {
  const { data, loading, error } = useApi<T>('/some/path')

  if (loading) return <p>Loading...</p>
  if (error)   return <p className="error">...</p>
  if (!data)   return null

  return <section> ...render data... </section>
}
```

**Early returns before JSX** — handle the three async states (loading, error,
empty) first, then the happy path. This keeps the render body clean and
prevents "cannot read property of null" crashes.

## Individual pages

### `Home.tsx`

```tsx
const { data: page, loading, error } = useApi<Page>('/pages/home')
...
{page.blocks.map((block) => (
  <ContentBlock key={block.id} block={block} />
))}
<div className="quick-links">
  <Link to="/academics">Browse Academics</Link>
  <Link to="/faculty">Meet the Faculty</Link>
</div>
```

- `data: page` — **renaming on destructure**: the hook returns `data`, this
  page calls it `page` because that's what it is.
- Fetches a specific CMS page by the slug `home`, so the homepage content is
  editable from the admin panel without code changes.
- `<Link>` (react-router) = client-side navigation, no full page reload.

### `Academics.tsx`

Fetches `Course[]`, renders a `.course-grid` of `<CourseCard>` components.
Note `courses?.map(...)` — the `?.` handles the moment before data arrives
(even though the loading return usually covers it).

### `Faculty.tsx`

Fetches `FacultyMember[]`, renders cards inline (no separate component —
a fine choice since it's used only here). Includes a `mailto:` link:

```tsx
<a href={`mailto:${member.email}`}>{member.email}</a>
```

Template literal inside JSX braces builds the URL at render time.

### `DynamicPage.tsx` — the CMS catch-all ⭐

```tsx
const { slug } = useParams<{ slug: string }>()
const { data: page, loading, error } = useApi<Page>(`/pages/${slug ?? ''}`)
```

- **`useParams`** reads the `:slug` segment from the URL — the same value the
  backend's `pageController.getBySlug` receives.
- `<T>` in `useParams<{ slug: string }>()` types the param as a string.
- `` `/pages/${slug ?? ''}` `` — builds the API path dynamically. `?? ''`
  guards against `slug` being undefined (avoids `.../pages/undefined`).
- Registered **last** in `App.tsx`'s `<Routes>`, so any URL not matched by a
  real route falls through here — that's how `/about` or `/admissions` serve
  CMS content created in the admin area.

## Connections

```
App.tsx ──routes──→ THIS FOLDER
THIS FOLDER ──imports──→ ../hooks/useApi
THIS FOLDER ──imports──→ ../api/types        (Page, Course, FacultyMember)
Home, DynamicPage ──imports──→ ../components/ContentBlock
Academics ──imports──→ ../components/CourseCard
Home ──imports──→ react-router's Link
DynamicPage ──imports──→ react-router's useParams
```
