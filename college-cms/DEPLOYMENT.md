# Deployment

How to run College CMS outside local development.

## Overview

Two processes + one database:

| Piece | Build | Serves |
| --- | --- | --- |
| backend | `npm run build` → `node dist/server.js` | Express API on `$PORT` (default 4000), including `GET /api/events` (SSE) |
| frontend | `npm run build` → static files in `frontend/dist/` | React SPA (nginx, Vercel, Netlify, …) |
| PostgreSQL 14+ | migrations via `npm run db:migrate` | content database |

The frontend calls the API with relative paths (`/api/...`), so both must be
reachable under the **same origin** (or you must configure CORS + the API base
yourself). The simplest production layout is one nginx in front of both.

## 1. Backend

```bash
cd backend
cp .env.example .env        # then edit values (see table below)
npm ci
npm run db:migrate          # apply committed drizzle migrations
npm run build
npm start                   # node dist/server.js
```

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `postgres://user:pass@host:5432/dbname` |
| `ADMIN_TOKEN`, `EDITOR_TOKEN` | yes | bearer tokens for `/api/admin/*`; generate with `openssl rand -hex 24` |
| `NODE_ENV` | yes | `production` in production |
| `PORT` | no | default `4000` |
| `TRUST_PROXY` | behind proxy | `true`/`1`/hop count — required so rate limiting sees real client IPs from `X-Forwarded-For` |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` | no | global API limit (default 300 req/60s) |
| `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS` | no | login-sensitive routes (default 30 req/60s) |
| `RATE_LIMIT_DISABLED` | dev only | set to `true` to disable rate limiting |
| `SSE_HEARTBEAT_MS`, `SSE_MAX_CLIENTS` | no | SSE heartbeat (default 25000 ms) and max concurrent event streams (default 100) |
| `CORS_ORIGINS` | if split-origin | comma-separated allowed origins |

Never commit `.env` (it is gitignored). Ship `.env.example` as the template.

### Process supervision

Any supervisor works. systemd example (`/etc/systemd/system/college-cms.service`):

```ini
[Unit]
Description=College CMS API
After=network.target postgresql.service

[Service]
WorkingDirectory=/srv/college-cms/backend
EnvironmentFile=/srv/college-cms/backend/.env
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

## 2. Frontend

```bash
cd frontend
npm ci
npm run build        # outputs frontend/dist/
```

Serve `frontend/dist/` as a static site with an SPA fallback (all unknown
paths → `index.html`). Prebuilt fallbacks included:

- `frontend/public/_redirects` — Netlify / Cloudflare Pages (`/* /index.html 200`)
- `frontend/vercel.json` — Vercel rewrites

### nginx (recommended: SPA + API on one origin)

```nginx
server {
    listen 443 ssl http2;
    server_name www.example.com;

    # ssl_certificate     /etc/letsencrypt/live/www.example.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/www.example.com/privkey.pem;

    # SPA
    root /srv/college-cms/frontend/dist;
    index index.html;

    # HSTS — set it here; the backend does not send Strict-Transport-Security
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API + SSE
    location /api/ {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # SSE: don't buffer or time out the event stream
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

Notes:

- `proxy_buffering off` + long `proxy_read_timeout` are required for
  `GET /api/events` (server-sent events). Without them the live-refresh
  connection stalls behind the proxy.
- Set `TRUST_PROXY=1` in `backend/.env` so rate limiting uses the real client
  IP forwarded in `X-Forwarded-For`.
- `gzip` on `text/html`/`application/json` is fine; do not gzip
  `text/event-stream`.

## 3. Database

```bash
cd backend
npm run db:migrate        # applies drizzle/*.sql in journal order
```

- Migrations are committed (`backend/drizzle/`); run them on every deploy.
- For a first-time setup you can seed demo content with `npm run db:seed`,
  and import the bundled departments file with
  `npm run db:import-departments` (reads `Departments.csv`).
- Back up with `pg_dump`; the app has no destructive migrations.

## 4. Post-deploy smoke test

```bash
curl -fsS https://www.example.com/api/health
curl -fsS https://www.example.com/api/openapi.json >/dev/null && echo openapi-ok
curl -fsS https://www.example.com/api/streams | head -c 200
curl -N  https://www.example.com/api/events   # prints "retry: 3000" + "event: ready", then ": heartbeat" every 25s

# admin auth
TOKEN=... # ADMIN_TOKEN value
curl -fsS -H "Authorization: Bearer $TOKEN" https://www.example.com/api/admin/whoami

# rate limiting responds with 429 + Retry-After once the window is exceeded
```

Then in a browser:

1. `https://www.example.com/` renders the homepage from the API.
2. Deep link works: `https://www.example.com/departments` reloads without a 404.
3. Sign in at `/admin/login` with the admin token.
4. Edit a department name in the admin, keep the public site open in another
   tab — it updates within ~1 s via the SSE stream (no manual reload).
5. "Skip to content" appears when pressing Tab first.

## 5. Security checklist

- [ ] `.env` exists only on the server; `ADMIN_TOKEN`/`EDITOR_TOKEN` are long random values
- [ ] HTTPS enabled; HSTS set by the reverse proxy (see the nginx snippet above) — the backend does not send `Strict-Transport-Security` itself
- [ ] `TRUST_PROXY` set correctly behind nginx (rate limiting + real IPs)
- [ ] `NODE_ENV=production`
- [ ] PostgreSQL not exposed publicly; strong `DATABASE_URL` password
- [ ] Frontend and API on the same origin (avoids CORS entirely) — otherwise
      set `CORS_ORIGINS` to the exact frontend origin(s)
- [ ] `npm ci` + committed lockfiles used for installs (no floating versions)

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Public pages show stale content after an admin edit | `/api/events` blocked — check `proxy_buffering off` and long read timeout for `/api/` |
| 429 from the API behind nginx | set `TRUST_PROXY=1`; all clients otherwise share the proxy IP |
| Admin login loops back to the login screen | token mismatch — `ADMIN_TOKEN`/`EDITOR_TOKEN` in server `.env` vs pasted value |
| Direct URL load 404s (e.g. `/departments/x`) | SPA fallback missing — `_redirects`/`vercel.json`/nginx `try_files` |
| `Expected a list response` from the frontend | API returned HTML (proxy sent `index.html`) — check the `/api/` location block |
