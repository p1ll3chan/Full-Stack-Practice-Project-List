# Frontend — React + TypeScript + Vite

The user-facing app: public pages (home, academics, faculty, CMS pages) plus
an admin area for creating content. It talks to the backend API at
`/api`.

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
| `npm run build` | `tsc -b` (type check) then `vite build` → `dist/` |
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
├── vite.config.ts      # React plugin + /api proxy
├── index.html          # the single HTML page Vite serves
├── tsconfig*.json      # TS config (app / node / root)
├── .oxlintrc.json      # linter rules
├── public/             # static files copied as-is (favicon, icons)
├── dist/               # build output (generated)
└── src/
    ├── main.tsx        # ⭐ entry — mounts <App /> into #root
    ├── App.tsx         # ⭐ routes — which URL shows which page
    ├── index.css       # all styles
    ├── api/            # fetch client + shared types
    ├── hooks/          # useApi — data fetching hook
    ├── components/     # Header, Footer, ContentBlock, CourseCard
    ├── pages/          # public pages
    ├── admin/          # Dashboard, PageEditor, CourseEditor
    └── assets/         # images (hero.png, svgs)
```

## Data flow

```
Page component
  → useApi('/academics/courses')        hooks/useApi.ts
    → api.get(...)                       api/client.ts  (fetch /api/...)
      → Vite proxy → backend :4000
        → Express → Drizzle → Postgres
  ← response parsed + stored in useState
← component re-renders with data / loading / error
```

## Two ways pages get data

1. **Read (GET)** → `useApi` hook — returns `{ data, loading, error, refetch }`
2. **Write (POST/PUT)** → admin editors call `api.post` / `api.put` directly
   from a click handler
