# `admin/` — Authenticated CMS

The write side of the app: an authenticated shell around managers and editors
for every content type. The public site in `../pages/` stays read-only; all
mutations from this folder go to `/api/admin/*` with a bearer token attached.

## Getting in: the first admin account

There is **no sign-up, no user table, and no default password shipped with the
repo**. The backend authenticates static tokens from `backend/.env`
(`ADMIN_TOKEN`, `EDITOR_TOKEN`). To create your first admin account:

```bash
openssl rand -hex 32          # generate a long random token
# add to backend/.env:
#   ADMIN_TOKEN=<the value>
#   EDITOR_TOKEN=<another value>   # optional second, lesser role
# restart the backend (npm run dev)
```

Then open `http://localhost:5173/admin/login` and paste the `ADMIN_TOKEN`
value. The form calls `GET /api/admin/whoami`; only a token the **backend**
recognises signs you in. Generate separate tokens per person you share them
with — the role (`editor`/`admin`) shown in the sidebar comes from the server,
never from the browser.

### How the token is held (deliberate design)

- Entered once at `/admin/login`, verified via `whoami`, then kept **in memory
  only** (`session.ts` + module-level `setAuthToken` in `api/client.ts`).
- It is **never written to localStorage/sessionStorage/cookies** — a stored
  token would survive tab close and leak to any XSS. The cost: every tab
  re-pastes the token, and a page reload signs you out.
- Every `request()` adds `Authorization: Bearer …` when a token is set; a `401`
  from the backend fires `setUnauthorizedHandler` → session cleared → the
  `RequireAuth` guard bounces you to `/admin/login`.
- Frontend guards are **UX only**. Real enforcement is server-side: without a
  valid token every `/api/admin/*` request fails (401), and `DELETE` endpoints
  additionally require the `admin` role (403 for editors — surfaced in the UI
  as an alert).

## Routes (`../routes.tsx`)

| Route | Component |
| --- | --- |
| `/admin/login` | `LoginPage` (outside the guard) |
| `/admin` | `RequireAuth` → `AdminLayout` → `Dashboard` |
| `/admin/pages`, `/admin/pages/new`, `/admin/pages/:id` | `PagesManager`, `PageEditor` |
| `/admin/about` | `AboutPage` (resolves the `about` slug → its editor) |
| `/admin/departments[+/new|/:id]` | `DepartmentsManager`, `DepartmentEditor` |
| `/admin/academics` | redirect → `degree-levels` |
| `/admin/academics/degree-levels[+/new|/:id]` | `DegreeLevelsManager`, `DegreeLevelEditor` |
| `/admin/academics/courses[+/new|/:id]` | `CoursesManager`, `CourseEditor` |
| `/admin/faculty[+/new|/:id]` | `FacultyManager`, `FacultyEditor` |
| `/admin/excellence[+/new|/:id]` | `ExcellenceManager`, `ExcellenceEditor` |
| `/admin/excellence/domains[+/new|/:id]` | `ExcellenceDomains`, `ExcellenceDomainEditor` (named exports) |
| `/admin/media` | `MediaManager` |
| `/admin/contact` | `ContactEditor` |

`RequireAuth` (`auth.tsx`) wraps all of `/admin` except the login page and
renders an `<Outlet/>`; `AdminLayout` adds the sidebar/topbar and a mobile menu
toggle around it.

## Files

| File | Role |
| --- | --- |
| `session.ts` | token session context: `login` (whoami verify), `logout`, 401 handler, `useAuth` |
| `auth.tsx` | `AuthProvider` + `RequireAuth` guard (redirect to login with `state.from`) |
| `LoginPage.tsx` | paste-token form; maps 401/403 to a friendly message |
| `AdminLayout.tsx` | sidebar nav (per content type), role badge `data-testid="admin-role"`, sign-out `data-testid="logout"` |
| `Dashboard.tsx` | `GET /admin/stats` via TanStack Query → stat cards + quick links |
| `PagesManager.tsx` | page list: search/section/status filters, publish badge, delete |
| `PageEditor.tsx` | page metadata (dirty-only partial save), publish toggle, block manager, draft vs public preview |
| `BlockForm.tsx` | add/edit a single block; validates against `blockSchema` before any request |
| `blockUtils.ts` | `blockToInput` (BlockView → API payload, preserves `rich`), `blockTypeLabels` |
| `AboutPage.tsx` | looks up slug `about`; links to create it with `?section=about&title=…` |
| `DepartmentsManager.tsx` / `DepartmentEditor.tsx` | streams CRUD + activate; editor has 4 cards: details, degree-level links, academic details, faculty intro |
| `DegreeLevelsManager.tsx` / `DegreeLevelEditor.tsx` | degree levels CRUD; editor also lists linked departments |
| `CoursesManager.tsx` / `CourseEditor.tsx` | courses CRUD; **cascading** department → degree-level select (levels come from the chosen stream's links; pairing checked client-side and by the server) |
| `FacultyManager.tsx` / `FacultyEditor.tsx` | faculty CRUD + photo via media picker |
| `ExcellenceManager.tsx` / `ExcellenceEditor.tsx` | excellence items CRUD, domain filter |
| `ExcellenceDomains.tsx` | domain manager + editor (named exports) |
| `MediaManager.tsx` | media list/search/status filter, add-by-URL, inline edit, guarded delete |
| `ContactEditor.tsx` | singleton `GET/PUT /admin/contact` |
| `MediaPicker.tsx` | shared select of media items + "add image URL" inline (used by image/gallery blocks, department cover, faculty photo) |
| `schemas.ts` | zod mirrors of every backend body schema + `issuesToErrors`/`detailsToErrors` |
| `useForm.ts` | `useForm` hook: zod validate → optional **dirty-only patch** → submit; maps `ApiError.details` to field errors |
| `form.tsx` | `FormField` (label association + error `role="alert"`), `SaveStatus`, two-step `ConfirmButton` |
| `rich.ts` | `richDocToText` / `textToRichDoc` — overview & faculty intro edited as one-paragraph-per-line |
| `api.ts` | `qs()` query-string builder, `useDebounced` for list search |
| `queryClient.ts` (in `../api/`) | TanStack Query defaults (no retry on `ApiError`) |

## Validation

`schemas.ts` hand-mirrors the backend zod schemas (slug regex, trimmed
lengths, credits 0–999, year 1900–2100, media URL must be `https://…` or a
root-relative `/…` path). `useForm` runs `safeParse` **before** any network
call; failures render per-field messages. Server rejections arrive as
`{error:{details:[{path,message}]}}` and are mapped onto the same fields.

## Data flow (TanStack Query)

- Lists/detail queries use keys from `adminKeys` (`api/queryKeys.ts`):
  `['admin','pages',params]`, `['admin','page',id]`, `['admin','streams',…]`, …
- Mutations invalidate **narrow** prefixes only — saving a page invalidates
  `adminKeys.pages.root` + `adminKeys.page(id)` + `stats`, never courses or
  faculty. Tests assert this (`pages.test.tsx`).
- The public read side is untouched: it still uses `useApi`/`useApiList`
  (fetch-per-mount), so admin edits show up on the public site on next
  navigation/reload.

## Block workflow (pages)

- Add: pick a type → `BlockForm` → `POST /admin/pages/:id/blocks`.
- Edit: inline `BlockForm` → `PUT …/blocks/:blockId` (full block payload).
- Reorder: Up/Down → `PUT …/blocks/order` with the full id permutation.
- Publish/Unpublish: `PUT` with `published` flipped — **archive = unpublished**
  (the schema has no archive state; drafts stay editable).
- Delete: two-step `ConfirmButton` → `DELETE …/blocks/:blockId`.
- Preview: "Draft preview" renders all blocks through `PageBlocks`;
  "As visitors see it" filters to `published` — the same renderer the public
  site uses.

## Unconfigured / deliberately out of scope

1. **No file uploads** — there is no storage backend. Media is registered by
   URL (https or site path); `MediaPicker` says so inline. `fileName` is a
   label, not a stored file.
2. **No per-user accounts** — one shared bearer token per role, pasted per
   tab; no password reset, no session history, no audit trail. Rotate a token
   by changing `backend/.env` and restarting.
3. **No rich-text editor** — academic overview and faculty intro are edited as
   plain paragraphs (one per line); saving a doc that contains headings/lists
   flattens them (the UI warns before you do it). Page blocks keep their
   structured fields instead.
4. **Public site stays on `useApi`** — no query-cache sharing between admin
   and public views; a public page refetches on mount.
5. Editors are plain forms; there is no autosave, versioning, or draft pages
   (draft = unpublished page/blocks).
