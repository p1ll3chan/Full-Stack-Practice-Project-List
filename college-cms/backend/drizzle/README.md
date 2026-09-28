# `drizzle/` — Generated SQL migrations

**Do not hand-edit these files.** Everything here is produced by
`drizzle-kit` from `src/db/schema.ts`.

## What's in here

```
drizzle/
├── 0000_bent_timeslip.sql    # the actual SQL to run
└── meta/
    ├── 0000_snapshot.json    # schema state after this migration
    └── _journal.json         # ordered list of applied migrations
```

### `0000_bent_timeslip.sql`

The initial migration — creates all four tables:

```sql
CREATE TABLE "courses" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(20) NOT NULL,
    ...
    CONSTRAINT "courses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "excellence" ( ... );
```

- `--> statement-breakpoint` — marker drizzle-kit inserts so it can split the
  file into separate statements when executing.
- `CONSTRAINT "courses_code_unique" UNIQUE("code")` — the SQL behind
  `.unique()` in `schema.ts`.

### `meta/`

- **`_journal.json`** — migration filenames in execution order. Drizzle
  records which ones have run inside a bookkeeping table in your database.
- **`0000_snapshot.json`** — the schema as of this migration. When you run
  `db:generate` again, drizzle-kit diffs your *current* `schema.ts` against
  this snapshot to produce only what changed.

That diffing is why migrations are safe: they generate the minimal SQL to get
from state A to state B, rather than dropping and recreating everything.

## Workflow

```
1. Edit src/db/schema.ts
2. npm run db:generate    → creates drizzle/0001_*.sql  (review it!)
3. git add drizzle/       → commit the file
4. npm run db:migrate     → applies it to your Postgres
```

**Commit the SQL.** Anyone else (or your production server) runs the same
files and ends up with an identical database.

## Alternatives

| Command | Behavior | Use when |
| --- | --- | --- |
| `db:generate` + `db:migrate` | Creates + applies versioned SQL | Teams, production, anything real |
| `db:push` | Diffs `schema.ts` straight against the DB | Quick local prototyping |
| `db:studio` | Opens a GUI to browse/edit rows | Inspecting data |

This project's `README.md` suggests `db:push` for dev — fine locally, but
generate real migrations before shipping.

## Connections

```
src/db/schema.ts ──read by──→ drizzle.config.ts ──run via──→ npm run db:generate
drizzle/*.sql ──applied by──→ npm run db:migrate ──into──→ PostgreSQL (DATABASE_URL)
src/db/index.ts ──connects to──→ same PostgreSQL
```

Config lives in `backend/drizzle.config.ts` (schema path, output dir, DB URL).
