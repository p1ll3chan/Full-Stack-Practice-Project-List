# `db/` — Database connection and schema

Two files, two jobs: **how to connect** and **what the tables look like**.

## `index.ts` — the connection

```ts
const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')

export const client = postgres(connectionString, { max: 10 })
export const db = drizzle(client, { schema })
```

- **`postgres`** (postgres.js) — raw driver that speaks the Postgres wire
  protocol. `{ max: 10 }` is a **connection pool**: at most 10 open
  connections, reused across requests instead of reopened each time.
- **`drizzle(client, { schema })`** — wraps that driver with the query
  builder. Passing `schema` enables typed `db.query.*` access.
- **`checkConnection()`** — runs `select 1` in a try/catch, returns `true`/
  `false` instead of throwing. Used by `GET /api/health` and the startup log.

Exports used elsewhere:

| Export | Imported by |
| --- | --- |
| `db` | every file in `services/`, plus `routes/admin.ts` |
| `client` | (available, currently only used internally) |
| `checkConnection` | `server.ts` |

## `schema.ts` — tables as TypeScript

Drizzle's core idea: describe your table in TS, and you get SQL *and* types
from one source of truth.

```ts
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull().notNull(),
  description: text('description').notNull().default(''),
  credits: integer('credits').notNull().default(3),
  department: varchar('department', { length: 255 }).notNull().default(''),
})
```

### Column helpers

| Helper | SQL equivalent |
| --- | --- |
| `serial('id').primaryKey()` | auto-increment `INTEGER PRIMARY KEY` |
| `varchar('x', { length: 255 })` | `VARCHAR(255)` |
| `text('x')` | `TEXT` (unlimited length) |
| `integer('x')` | `INTEGER` |
| `boolean('x')` | `BOOLEAN` |
| `timestamp('x')` | `TIMESTAMP` |
| `jsonb('x')` | `JSONB` (native JSON in Postgres) |
| `.notNull()` | `NOT NULL` |
| `.unique()` | `UNIQUE` |
| `.default(v)` | `DEFAULT v` |
| `.defaultNow()` | `DEFAULT now()` |
| .$type<T>()` | TS-only: casts the value type (no SQL effect) |

### Tables defined here

| Table | Purpose | Key columns |
| --- | --- | --- |
| `pages` | CMS content blocks | `slug` (unique), `blocks` (jsonb), `published` |
| `courses` | Academic courses | `code` (unique), `credits`, `department` |
| `faculty` | Staff directory | `name`, `email`, `bio` |
| `excellence` | Awards/achievements | `title`, `category`, `year` |

### Generated types (lines 53-60)

```ts
export type Page     = typeof pages.$inferSelect   // rows you READ
export type NewPage   = typeof pages.$inferInsert   // rows you INSERT
```

Same pattern for `Course`, `FacultyMember`, `ExcellenceItem`.
**Rename a column in the schema → the compiler errors at every usage site.**
That guarantee is the whole point of using an ORM like this.

## Who uses what

```
schema.ts ──types──→ services/*.ts   (Page, NewPage, Course, ...)
schema.ts ──tables──→ services/*.ts  (db.insert(courses)...)
schema.ts ──tables──→ routes/admin.ts
index.ts  ──db─────→ services/*.ts, routes/admin.ts
drizzle.config.ts reads schema.ts to generate SQL migrations
```

## Migration workflow

```
schema.ts ──npm run db:generate──→ drizzle/0001_*.sql (new file, commit it)
drizzle/0001_*.sql ──npm run db:migrate──→ applied to Postgres
```

`npm run db:push` skips the file — fine for prototyping, wrong for teams.
