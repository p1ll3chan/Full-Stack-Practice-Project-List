# `tests/` — Frontend test suites

Vitest (jsdom environment, configured in `../../vite.config.ts`) + React Testing
Library. Run with:

```bash
npm test           # vitest run
npm run lint       # oxlint
npm run typecheck  # tsc -b
```

Vitest globals are **off** (`tsconfig.app.json` has no `vitest/globals`
types) — every file imports what it uses:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
```

## Shared helpers — `testUtils.ts`

| Helper | Purpose |
| --- | --- |
| `jsonResponse(body, status)` | minimal `Response`-shaped object (`ok`, `status`, `text()`, `json()`) |
| `stubFetch(handler)` | replaces `fetch` with a URL-routed fake; unmatched URLs → 404 `not_found` (returns the spy for assertions) |
| `meta(page, limit, total, totalPages)` | a `ListMeta` factory for list envelopes |

`handler` is `(url) => { status?, body } | undefined` — match on
`url.startsWith('/api/...')` / `url.includes('q=...')`. **Order matters**:
put more specific prefixes (e.g. `/api/academics/courses`) before broad
substring checks (e.g. `limit=100`), or a broad rule will swallow specific
URLs.

Each suite cleans up with:

```ts
afterEach(() => {
  cleanup()               // RTL renders (vitest globals off → no auto-cleanup)
  vi.unstubAllGlobals()   // restore the real fetch
})
```

## Suites

| File | Covers |
| --- | --- |
| `client.test.ts` | envelope unwrap, `api.list` meta, `ApiError` 404 (`code`, `isNotFound`), network errors → `network_error`, 204 → `undefined` |
| `blocks.test.tsx` | all block types render (heading/text/list/image/gallery), content changes re-render, `<script>`/`onerror` payloads stay text, null media → placeholder, unknown type renders nothing, `RichText` sanitizes `javascript:` hrefs but keeps `target="_blank"` rel |
| `cards.test.tsx` | Department/Course/Faculty/Excellence cards render API data and link to the right hrefs |
| `routes.test.tsx` | `<AppRoutes />` in a `MemoryRouter`: homepage from API content, invalid department slug → `not-found`, unknown CMS slug → `not-found`, shared `StreamNav`/`CourseNav` across `/academics/streams/:slug` and `/faculty/streams/:slug`, course detail by id |
| `departments.test.tsx` | listing renders cards, category options derived from data, pagination status line + disabled prev, debounced search reaches the API as `q=` |
| `phase5.test.tsx` | live sync + hardening: a `content` event (fake `EventSource`) refetches the open public page while keeping current content on screen; `ContentSync` invalidates `['admin']`; skip link ↔ `#main` landmark; empty-dataset home/departments states; API outage → `ErrorState` → "Try again" recovers; deep routes (`/excellence/domains/:slug`, `/faculty/:id`) entered directly; `document.title` on page-header, not-found, login, and active admin section; cross-entity invalidation (department degree-level links → `degree-levels`/`degree-level`, media delete → `pages`) |

The sync suite stubs `EventSource` in `beforeEach` and drives it through a
local `FakeEventSource`; `contentEvents.ts` debounces 300 ms, so tests wait
(`settleDebounce()`) before asserting the refetch.

## Admin suites (`../admin/*.test.*`)

Same helpers, plus `createQueryClient()` wrappers and `MemoryRouter` routes:

| File | Covers |
| --- | --- |
| `admin/schemas.test.ts` | zod mirrors reject bad slugs, empty titles, image blocks without `mediaId`, heading levels outside 1–6, credits/year bounds, non-http(s) media URLs, bad degree codes; `issuesToErrors` maps paths to fields |
| `admin/auth.test.tsx` | `RequireAuth` redirects signed-out visitors to `/admin/login`; login sends `Authorization: Bearer …` only after `whoami` succeeds; rejected token shows the alert and stays out; a later `401` fires the logout handler |
| `admin/pages.test.tsx` | page list filters + status badge; create posts a validated body and navigates to `/admin/pages/:id`; save with no edits sends **no** PUT and says "No changes to save."; a dirty save PUTs only `{title}` and invalidates `['admin','pages']` + `['admin','page',id]` + `stats` (and never `['admin','courses']`); empty new block fails client validation before any `/blocks` request |

Auth tests also reset the module-level token between cases
(`setAuthToken(null)` in `afterEach`) so the shared client starts clean.

## Conventions

- Render routes with `<MemoryRouter initialEntries={[...]}>` + `<AppRoutes />`
  — no real `BrowserRouter`, no history leakage.
- Async UI → always `await screen.findByRole(...)`; assert attributes via
  `.getAttribute('href')`.
- Keep test data minimal but shape-accurate (typed as the real
  `../api/types`) so typecheck catches contract drift.
