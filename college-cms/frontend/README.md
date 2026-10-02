# Frontend — React + TypeScript + Vite

The user-facing app: a fully dynamic, read-only public site (home, departments,
academics, faculty, excellence, CMS catch-all) plus an admin area for creating
content. Every page renders API data — there is no hardcoded content. It talks
to the backend API through the `/api` proxy.

## Run it

```bash
npm install
npm run dev    # http://localhost:5173
```

The backend must also be running on port 4000 (see `../backend/README.md`).

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Starts Vite dev server with HMR (hot reload) |
| `npm run typecheck` | `tsc -b` — full-project type check (no emit) |
| `npm run test` | `vitest run` — component/route/client tests (jsdom) |
| `npm run build` | `tsc -b` then `vite build` → `dist/` |
| `npm run lint` | Runs oxlint |
| `npm run preview` | Serves the built `dist/` locally |

## Libraries

| Package | Role |
| --- | --- |
| `react` (v19) | UI library — components, state, effects |
| `react-dom` | Renders React into the DOM |
| `react-router-dom` (v7) | Client-side routing (`<Routes>`, `<Link>`) |
| `vite` (v8) | Dev server + bundler (replaces webpack/CRA) |
| `@vitejs/plugin-react` | Vite plugin: JSX transform + Fast Refresh |
| `oxlint` | Fast linter (ESLint alternative) |
| `typescript` | Type checking via `tsc -b` |
| `vitest` + `jsdom` | Test runner (Vite-native) in a fake DOM |
| `@testing-library/react` | Render components + query the DOM in tests |
| `@tanstack/react-query` | Admin data layer: cache, invalidation, mutations |
| `zod` | Client-side validation mirroring the backend schemas |

## The proxy (important)

`vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:4000', changeOrigin: true },
  },
},
```

The browser would normally block calling `localhost:4000` from
`localhost:5173` (CORS). Instead, the frontend calls **relative** `/api/...`
and Vite forwards those requests to the backend during development.

In production you'd replace this with a real reverse proxy (nginx) or the
backend's own `cors()` middleware.

## Folder map

```
frontend/
├── package.json        # scripts + dependencies
├── vite.config.ts      # React plugin + /api proxy + vitest config
├── index.html          # the single HTML page Vite serves
├── tsconfig*.json      # TS config (app / node / root)
├── .oxlintrc.json      # linter rules
├── public/             # static files copied as-is (favicon, icons)
├── dist/               # build output (generated)
└── src/
    ├── main.tsx        # ⭐ entry — mounts <App /> into #root
    ├── App.tsx         # BrowserRouter wrapper → <AppRoutes />
    ├── routes.tsx      # ⭐ the full route table (also used by tests)
    ├── index.css       # all styles
    ├── api/            # fetch client, contract types, query keys, typed hooks
    ├── hooks/          # useApi / useApiList — data-fetching hooks
    ├── components/     # Header, Footer, states, block registry, cards, nav
    ├── pages/          # public pages, one per route
    ├── admin/          # authenticated CMS: session, guard, layout, managers/editors
    ├── tests/          # vitest suites (client, blocks, cards, routes, listings, admin, phase5)
    └── assets/         # images (hero.png, svgs)
```

## Data flow

```
Page component
  → useXxx hook (src/api/hooks.ts)          request-path via queryKeys
    → useApi / useApiList (hooks/useApi.ts) state: data / loading / error
      → api.get/list (api/client.ts)        envelope unwrap + ApiError
        → Vite proxy → backend :4000
          → Express → Drizzle → Postgres
← component re-renders with data / loading / error / not-found
```

## Two ways pages get data

1. **Public reads** → typed hooks (`usePageBySlug`, `useCourseList`, …) built
   on `useApi`/`useApiList` — always with a query key from `api/queryKeys.ts`
2. **Admin screens** (`src/admin/`) → TanStack Query: `useQuery` keyed with
   `adminKeys`, mutations `api.post/put/delete` + narrow invalidation;
   validation via zod mirrors in `admin/schemas.ts` before any request

**Live refresh:** both layers subscribe to `GET /api/events` (SSE) via
`api/contentEvents.ts` (one shared `EventSource`, 300 ms debounce). Public
hooks refetch their own path (stale-while-revalidate — content stays on
screen), and `admin/ContentSync.tsx` invalidates `['admin']` so every open
admin tab re-reads after someone else saves.

## Admin (CMS)

```bash
# backend/.env — generate once, per person, no default in the repo
openssl rand -hex 32   # → ADMIN_TOKEN=... (restart the backend)
```

Open `/admin/login`, paste the token; it is verified against
`GET /api/admin/whoami` and held **in memory only** (never localStorage —
reloading signs you out). Editors get a reduced role; `DELETE` calls need the
`admin` token (403 otherwise). Full usage: `src/admin/README.md`.

## Tests

`npm test` runs vitest with the jsdom environment (`vite.config.ts`):

| Suite | Covers |
| --- | --- |
| `src/tests/client.test.ts` | envelope unwrap, list meta, `ApiError` status/code, network error |
| `src/tests/blocks.test.tsx` | every CMS block type, injection stays text, media fallback |
| `src/tests/cards.test.tsx` | Department/Course/Faculty/Excellence cards render API data |
| `src/tests/routes.test.tsx` | homepage from API, 404s, shared stream/course navigation |
| `src/tests/departments.test.tsx` | filters, pagination status, debounced search query |
| `src/tests/phase5.test.tsx` | SSE content-event refresh, admin invalidation bridge, empty dataset, outage + retry, deep routes, `document.title`, cross-entity invalidation |
| `src/admin/schemas.test.ts` | zod mirrors: slug/title/block/media/credits/year rules |
| `src/admin/auth.test.tsx` | login header flow, guard redirect, 401 auto-logout |
| `src/admin/pages.test.tsx` | list filters, create POST, dirty-only PATCH + narrow invalidation, block validation gate |
