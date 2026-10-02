# `components/` — Reusable UI pieces

Small, focused components. They receive data via **props** and render markup —
no fetching (except `StreamNav`/`CourseNav`, which read lists for shared
navigation) and no routing logic (except `Header`).

Most are **default exports** of function components; grouped utilities
(`states`, `blocks`, `ExcellenceCard`) use named exports.

## Async state components — `states.tsx` ⭐ shared by every page

| Export | Renders |
| --- | --- |
| `Loading` | spinner + label (default `Loading…`) |
| `ErrorState` | message + **Retry** button (`refetch`); 404 errors render `NotFoundPage` instead |
| `EmptyState` | "nothing here yet" message + optional hint |
| `NotFoundPage` | 404 hero with `data-testid="not-found"` + links home |

```tsx
if (loading) return <Loading />
if (error) return <ErrorState error={error} onRetry={refetch} />
if (!data) return <EmptyState message="No results" />
```

## Layout & chrome

| File | Role |
| --- | --- |
| `Header.tsx` | `NavLink` bar: Home, About, Departments, Academics, Excellence, Faculty, Contact, Admin — `end` on `/` so Home isn't always active. Rendered on every route by `App.tsx`. |
| `Footer.tsx` | 7 lines, copyright with current year |
| `PageHeader.tsx` | consistent page hero: eyebrow + `h1` title + subtitle |

## CMS rendering

| File | Role |
| --- | --- |
| `blocks.tsx` | `HeadingBlock`, `TextBlock`, `ListBlock`, `ImageBlock`, `GalleryBlock` — one component per `BlockView` type, typed via `Extract<BlockView, { type: … }>['content']` |
| `blockRegistry.tsx` | `blockRegistry: Record<PageBlockType, BlockRenderer>` — maps each block type to its renderer (no `switch` at call sites; unknown types are a type error) |
| `PageBlocks.tsx` | `page.blocks.map(...)` → registry lookup → `<Fragment key>` — used by `Home`, `DynamicPage`, `CmsSection` |
| `RichText.tsx` | renders `RichDoc` nodes (paragraph/heading/list) as React elements. **Sanitizes** hrefs (`https?`, `//`, `mailto:`, `tel:`, safe relatives only) and colors (hex/word) — never `dangerouslySetInnerHTML` |
| `MediaImage.tsx` | `MediaLike` (`{ url, altText }`) image with `onError` → styled placeholder fallback (for missing/null media URLs) |

```tsx
<PageBlocks blocks={page.blocks} />
```

## Cards

| File | Props | Used by |
| --- | --- | --- |
| `DepartmentCard.tsx` | `{ stream, image? }` | `Departments`, `Home` preview |
| `CourseCard.tsx` | `{ course, to? }` | `Academics`, `CourseNav` (optional `to` wraps in a link) |
| `FacultyCard.tsx` | `{ member, streamSlug? }` | `Faculty`, `FacultyStream` |
| `ExcellenceCard.tsx` | `ExcellenceDomainCard { domain }`, `ExcellenceItemCard { item }` | `Excellence`, `ExcellenceDomain` |

Cards are pure display: API object in, `<article>` out. Hrefs are built from
slugs/ids (e.g. `/departments/:slug`, `/academics/courses/:id`).

## Shared navigation

| File | Props | Role |
| --- | --- | --- |
| `StreamNav.tsx` | `{ base, activeSlug, allLabel, allTo }` | horizontal chips of all departments linking under a `base` path (`/academics/streams`, `/faculty/streams`, `/departments`) — the shared stream navigation between Academics and Faculty |
| `CourseNav.tsx` | `{ streamSlug }` | list of courses for a stream → `/academics/courses/:id` (shared on academic + faculty detail pages) |
| `Pagination.tsx` | `{ meta, onPageChange }` | prev/next + `Page x of y · n results`; hidden when only one page |

## Connections

```
App.tsx ──renders──→ Header, Footer
Home / DynamicPage / CmsSection ──render──→ PageBlocks → blockRegistry → blocks
Departments / Home ──map──→ DepartmentCard
Academics / CourseNav ──map──→ CourseCard
Faculty / FacultyStream ──map──→ FacultyCard
Excellence / ExcellenceDomain ──map──→ ExcellenceCard
AcademicDetail / FacultyStream ──render──→ StreamNav, CourseNav
every page ──uses──→ states.tsx (Loading / ErrorState / EmptyState)
```
