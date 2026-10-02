# `pages/` — Public-facing routes

One component per route; the full table lives in `../routes.tsx`:

| File | Route | Data source (typed hooks) |
| --- | --- | --- |
| `Home.tsx` | `/` | `CmsSection slug="home"` + `useStreamList({ limit: 6 })` preview |
| `About.tsx` | `/about` | `CmsSection slug="about"` |
| `Contact.tsx` | `/contact` | `CmsSection slug="contact"` + `useContact()` details card |
| `Departments.tsx` | `/departments` | `useStreamList` (search/category/pagination) + `useAllStreams` (categories) |
| `DepartmentDetail.tsx` | `/departments/:slug`, `/streams/:slug` | `useStreamBySlug` + `useCourseList({ stream })` |
| `Academics.tsx` | `/academics` | `CmsSection slug="academics"` + `useDegreeLevelList` + `useStreamList` + `useCourseList` |
| `AcademicDetail.tsx` | `/academics/streams/:slug` | `useAcademicDetails(slug)` + shared `StreamNav`/`CourseNav` |
| `CourseDetail.tsx` | `/academics/courses/:id` | `useCourseById` + `useAllStreams` (department link) |
| `Faculty.tsx` | `/faculty` | `CmsSection slug="faculty"` + `useFacultyList` |
| `FacultyStream.tsx` | `/faculty/streams/:slug` | `useStreamBySlug` + `useFacultyList({ stream })` + `CourseNav` |
| `FacultyDetail.tsx` | `/faculty/:id` | `useFacultyById` |
| `Excellence.tsx` | `/excellence` | `CmsSection slug="excellence"` + `useExcellenceDomains` + `useExcellenceList` |
| `ExcellenceDomain.tsx` | `/excellence/domains/:slug` | `useExcellenceDomain` + `useExcellenceList({ domain })` |
| `DynamicPage.tsx` | `/:slug` (catch-all) | `usePageBySlug(slug)` — CMS content |
| `NotFound.tsx` | `*` | static `NotFoundPage` |
| `CmsSection.tsx` | *(not a route)* | shared renderer: page header + blocks + children |

All reads go through typed hooks (`../api/hooks.ts`) — read-only pages, no
forms. Writes happen in `../admin/`.

## The universal pattern

Every page follows this skeleton (via `components/states.tsx`):

```tsx
export default function X() {
  const { data, loading, error, refetch } = useXxx(param)

  if (loading) return <Loading />
  if (error)   return <ErrorState error={error} onRetry={refetch} />
  if (!data)   return <EmptyState message="Nothing here yet." />

  return <section> ...render data... </section>
}
```

**Early returns before JSX** — handle the three async states (loading, error,
empty) first, then the happy path. `ErrorState` shows a Retry button (calls
`refetch`) and renders the not-found page automatically on 404
(`ApiError.isNotFound`).

## Individual pages

### `CmsSection.tsx` — the shared CMS renderer

```tsx
export default function CmsSection({ slug, children }: CmsSectionProps) {
  const { data: page, loading, error, refetch } = usePageBySlug(slug)
  ...
  <PageHeader title={page.title} />
  <PageBlocks blocks={page.blocks} />
  {children}
}
```

Fetches a CMS page by slug and renders its blocks through the block registry.
`About` is literally `return <CmsSection slug="about" />`. `Home`,
`Academics`, `Faculty`, `Excellence`, `Contact` compose it with page-specific
sections as `children` — so intro content stays editable in the CMS while the
data sections stay coded.

### `Home.tsx`

```tsx
<CmsSection slug="home">
  <div className="quick-links"> ...Links to academics/faculty/departments... </div>
  <DepartmentPreview />   // useStreamList({ limit: 6, sort: 'sortOrder' })
</CmsSection>
```

- `DepartmentPreview` is a private component with its own hook call — hooks
  are per-component, so each section owns its own async state.

### `Departments.tsx` — search, filter, paginate ⭐ most interactive

- `useStreamList({ q, category, page, limit: 9, sort: 'sortOrder' })` — the
  list is **server-driven**: every keystroke (debounced 300 ms), category
  change, and page change re-issues the request.
- Category options are derived from `useAllStreams()` (distinct `category`
  values) — no hardcoded filter list.
- `meta` from `useApiList` feeds `<Pagination>` (`Page x of y · n results`).

### `DynamicPage.tsx` — the CMS catch-all

```tsx
const { slug } = useParams<{ slug: string }>()
const { data: page, loading, error, refetch } = usePageBySlug(slug ?? '')
```

- **`useParams`** reads the `:slug` segment — same value the backend's
  `pageController.getBySlug` receives.
- Registered **second to last** in `routes.tsx`, so any URL not matched by a
  real route falls through here — `/about`-style CMS pages created in the
  admin area work without code changes. Unknown slugs (404) render the
  not-found page via `ErrorState`.
- The final `*` route (`NotFound`) catches paths that don't fit `/:slug`
  (e.g. `/a/b` with two segments).

### `CourseDetail.tsx` / `FacultyDetail.tsx` — numeric ids

`useParams` gives `string | undefined`; both validate the id
(`/^\d+$/` test) and pass `undefined` to the hook when invalid — the hook
skips fetching, and the page renders not-found. This avoids requests like
`/courses/undefined`.

## Connections

```
routes.tsx ──routes──→ THIS FOLDER
THIS FOLDER ──imports──→ ../api/hooks        (typed data hooks)
THIS FOLDER ──imports──→ ../api/types        (Page, Course, Stream, ...)
THIS FOLDER ──imports──→ ../components/*     (PageBlocks, cards, states, nav)
Home, About, Academics, Faculty, Excellence, Contact ──compose──→ CmsSection
DynamicPage ──imports──→ react-router's useParams
```
