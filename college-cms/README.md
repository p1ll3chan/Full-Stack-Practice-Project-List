# College CMS

Full-stack college content management system: React + TypeScript + Vite frontend, Express + TypeScript backend, Drizzle ORM on PostgreSQL.

## Structure

```
college-cms/
├── frontend/          # Vite + React 19 + TypeScript
│   └── src/
│       ├── components/  # Header, Footer, ContentBlock, CourseCard
│       ├── pages/       # Home, Academics, Faculty, DynamicPage
│       ├── admin/       # Dashboard, PageEditor, CourseEditor
│       ├── hooks/       # useApi
│       ├── api/         # typed fetch client + types
│       ├── App.tsx
│       └── main.tsx
├── backend/           # Express 5 + TypeScript + Drizzle ORM
│   └── src/
│       ├── routes/      # pages, academics, faculty, excellence, admin
│       ├── controllers/
│       ├── services/
│       ├── db/          # schema.ts, index.ts
│       ├── middleware/  # errors, params
│       └── server.ts
│   ├── drizzle/        # generated SQL migrations
│   ├── drizzle.config.ts
│   └── .env
└── README.md
```

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) — or any PostgreSQL 14+ instance

## Database

Start the bundled PostgreSQL container:

```bash
docker run -d --name college-cms-db \
  -e POSTGRES_USER=cms \
  -e POSTGRES_PASSWORD=cms_secret \
  -e POSTGRES_DB=college_cms \
  -p 5432:5432 \
  -v college-cms-pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

Connection settings live in `backend/.env` (`DATABASE_URL`).

## Backend

```bash
cd backend
npm install
npm run db:push      # sync schema to Postgres (dev)
npm run db:generate  # create SQL migration files
npm run dev          # http://localhost:4000
```

Other scripts: `npm run typecheck`, `npm run build`, `npm start`, `npm run db:studio`.

### API

| Method | Route                        | Description            |
| ------ | ---------------------------- | ---------------------- |
| GET    | `/api/health`                | Health + DB status     |
| GET    | `/api/admin/stats`           | Counts for dashboard   |
| GET    | `/api/pages`                 | List pages             |
| GET    | `/api/pages/:slug`           | Page by slug           |
| POST   | `/api/pages`                 | Create page            |
| PUT    | `/api/pages/:id`             | Update page            |
| DELETE | `/api/pages/:id`             | Delete page            |
| GET    | `/api/academics/courses`     | List courses           |
| POST   | `/api/academics/courses`     | Create course          |
| PUT    | `/api/academics/courses/:id` | Update course          |
| DELETE | `/api/academics/courses/:id` | Delete course          |
| GET    | `/api/faculty`               | List faculty           |
| POST   | `/api/faculty`               | Create faculty member  |
| PUT    | `/api/faculty/:id`           | Update faculty member  |
| DELETE | `/api/faculty/:id`           | Delete faculty member  |
| GET    | `/api/excellence`            | List excellence items  |
| POST   | `/api/excellence`            | Create excellence item |

## Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173 (proxies /api → :4000)
```

Other scripts: `npm run build`, `npm run lint`, `npm run preview`.
