# `components/` — Reusable UI pieces

Small, focused, presentational components. They receive data via **props**
and render markup — no fetching, no routing logic (except `Header`).

All are **default exports** of function components:

```tsx
export default function CourseCard({ course }: { course: Course }) { ... }
```

`{ course }: { course: Course }` — destructures the props object and types it
inline. `course` is required; omitting it is a compile error.

## Files

### `Header.tsx` — site navigation

```tsx
const links = [
  { to: '/', label: 'Home' },
  { to: '/academics', label: 'Academics' },
  { to: '/faculty', label: 'Faculty' },
  { to: '/admin', label: 'Admin' },
]

{links.map((l) => (
  <NavLink key={l.to} to={l.to} end={l.to === '/'}>
    {l.label}
  </NavLink>
))}
```

- **`NavLink`** (from `react-router-dom`) — an anchor that automatically gets
  an `active` class when the current URL matches.
- **`end`** — for `/` only. Without it, every path would "match" `/` as a
  prefix, so Home would always look active.
- **`key={l.to}`** — React requires a stable key when rendering lists.
- The data lives in a module-level `const` so it's declared once, not on
  every render.

Rendered by `App.tsx` on **every** route (it sits outside `<Routes>`).

### `Footer.tsx` — 7 lines, no props

```tsx
&copy; {new Date().getFullYear()} College CMS. All rights reserved.
```

`{new Date().getFullYear()}` — a JS expression inside JSX braces; computes
the year at render time.

### `CourseCard.tsx` — one course, styled as a card

Pure display: takes a `Course`, emits an `<article>` with code, credits,
title, description, department. Used by `pages/Academics.tsx`.

### `ContentBlock.tsx` — the CMS renderer ⭐ most interesting

```tsx
switch (block.type) {
  case 'heading':   return <h2>{block.content}</h2>
  case 'paragraph': return <p>{block.content}</p>
  case 'image':     return <img src={block.content} alt="" className="content-image" />
  case 'list':
    return (
      <ul>
        {block.content.split('\n').filter(Boolean).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    )
  default: return null
}
```

This is the bridge between stored data and rendered HTML:

- `block.type` is the union `'heading' | 'paragraph' | 'image' | 'list'`
  defined in `api/types.ts` — the `default` branch is still needed for
  runtime safety against bad/stale data.
- **List trick:** the DB stores list items as one newline-separated string.
  `.split('\n')` → array, `.filter(Boolean)` → drops empty lines, `.map()` →
  `<li>` elements.
- Each `<li>` gets `key={i}` (index) — acceptable here because the list is
  static per render.

Used by `pages/Home.tsx` and `pages/DynamicPage.tsx` to turn `page.blocks[]`
into real DOM.

## Connections

| Component | Used by | Props come from |
| --- | --- | --- |
| `Header` | `App.tsx` (all routes) | none |
| `Footer` | `App.tsx` (all routes) | none |
| `CourseCard` | `pages/Academics.tsx` | `useApi<Course[]>` |
| `ContentBlock` | `pages/Home.tsx`, `pages/DynamicPage.tsx` | `page.blocks` from `useApi<Page>` |

```
App.tsx ──renders──→ Header, Footer
Academics ──maps──→ CourseCard
Home / DynamicPage ──maps──→ ContentBlock
```
