# `admin/` — Content management UI

The write side of the app: create/edit pages and courses. Unlike `../pages/`
(read-only), these components call `api.post` / `api.put` directly from click
handlers.

Routes registered in `../App.tsx`:

| Route | Component |
| --- | --- |
| `/admin` | `Dashboard` |
| `/admin/pages/new` | `PageEditor` (via `AdminNewPage` wrapper) |
| `/admin/courses/new` | `CourseEditor` (via `AdminNewCourse` wrapper) |

> ⚠️ **There is no authentication.** Anyone can visit `/admin`. The backend
> POST/PUT/DELETE routes are equally open. Adding auth (JWT/session +
> middleware) is a required task before this goes anywhere real.

## `Dashboard.tsx` — stats + page list

```tsx
const { data: stats, loading, error } = useApi<Stats>('/admin/stats')
const { data: pages }                    = useApi<Page[]>('/pages')
```

Two independent hook calls → two independent requests. The local `Stats`
interface (lines 5-9) matches what `routes/admin.ts` returns:

```ts
interface Stats { pages: number; courses: number; faculty: number }
```

Renders:

- `.stat-grid` of count cards using **nullish coalescing**: `{stats?.pages ?? '—'}`
  — shows an em-dash until data arrives (or if the request failed).
- Action buttons: `<Link to="/admin/pages/new">`, `<Link to="/admin/courses/new">`.
- A list of pages with a published badge:

```tsx
<span className={`badge ${p.published ? 'badge-live' : 'badge-draft'}`}>
  {p.published ? 'Published' : 'Draft'}
</span>
```

Template literal builds the class name; ternary picks label + style.

> Note: line 47 links to `/admin/pages/${p.id}` but **no such route exists**
> in `App.tsx` — clicking an existing page does nothing useful. Known gap:
> edit mode needs a route + passing `page` as a prop.

## `PageEditor.tsx` — block-based content editor

The most complex component here. Supports create (no props) and edit
(`page?: Page` prop optional).

### State (lines 12-16)

```tsx
const [title, setTitle]     = useState(page?.title ?? '')
const [slug, setSlug]       = useState(page?.slug ?? '')
const [published, setPublished] = useState(page?.published ?? false)
const [blocks, setBlocks]   = useState<ContentBlockData[]>(page?.blocks ?? [emptyBlock()])
const [status, setStatus]   = useState<string | null>(null)
```

Five separate `useState` calls — one per field. `page?.x ?? fallback` gives
edit mode pre-filled values, create mode empty ones. `status` is the
save-feedback message ("Saving...", "Saved.", "Save failed: ...").

### `emptyBlock` (lines 5-9)

```ts
const emptyBlock = (): ContentBlockData => ({
  id: crypto.randomUUID(),
  type: 'paragraph',
  content: '',
})
```

`crypto.randomUUID()` — browser API producing a unique ID. React lists need
**stable keys**; index-based keys break when you insert/remove/reorder items,
so each block carries its own ID.

### Immutable updates

```tsx
const updateBlock = (id: string, patch: Partial<ContentBlockData>) =>
  setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)))
```

Never mutate — `.map()` returns a **new array** with the matching block
spread-merged. React re-renders only when state reference changes.

Add / remove:

```tsx
setBlocks((bs) => [...bs, emptyBlock()])        // append
setBlocks((bs) => bs.filter((b) => b.id !== id)) // remove by id
```

`setBlocks((bs) => ...)` — **updater form**: uses the latest state instead of
a possibly stale captured value. Always prefer it inside event handlers.

### Save (lines 21-34)

```tsx
const save = async () => {
  setStatus('Saving...')
  try {
    const payload = { title, slug, published, blocks }
    if (page) await api.put<Page>(`/pages/${page.id}`, payload)   // edit
    else      await api.post<Page>('/pages', payload)             // create
    setStatus('Saved.')
  } catch (err) {
    setStatus(`Save failed: ${(err as Error).message}`)
  }
}
```

- `async` + `await` inside an `onClick` handler.
- `try/catch` turns a rejected `fetch` into an on-screen message.
- `(err as Error)` — `catch` binds `unknown` in strict TS; cast to read `.message`.
- Same branch logic in the backend's `pageController.update` vs `.create`.

### The block editor UI (lines 56-84)

For each block: a `<select>` for type, a `<textarea>` for content, a Remove
button. The cast on line 61:

```tsx
onChange={(e) => updateBlock(block.id, { type: e.target.value as ContentBlockData['type'] })}
```

DOM events give `string`; `as` tells TS it's one of the four allowed values.

## `CourseEditor.tsx` — classic form

Simpler: **one** state object instead of five.

```tsx
const [form, setForm] = useState({ code, title, description, credits, department })

const set = (key: keyof typeof form, value: string | number) =>
  setForm((f) => ({ ...f, [key]: value }))
```

- **`keyof typeof form`** — the union of the object's own keys
  (`'code' | 'title' | ...`), so `set('cod', ...)` won't compile.
- **Computed property** `[key]: value` — sets whichever key was passed.
- Single generic `set()` handler instead of five separate setters — a
  cleaner pattern worth copying.

Credits input converts explicitly:

```tsx
onChange={(e) => set('credits', Number(e.target.value))}
```

Text inputs always deliver strings — `Number()` keeps `credits` a number so
the API receives `credits: 3`, not `"3"`.

Same `save()` / `status` pattern as `PageEditor`.

## Connections

```
App.tsx ──routes──→ THIS FOLDER
Dashboard ──useApi──→ ../hooks/useApi → ../api/client → /admin/stats, /pages
PageEditor ──api.post/put──→ ../api/client → /api/pages
CourseEditor ──api.post/put──→ ../api/client → /api/academics/courses
both ──types──→ ../api/types
```

## Known gaps

1. No auth on any admin route (frontend or backend).
2. Dashboard links to `/admin/pages/:id` — route doesn't exist.
3. No client-side validation before submit (relies on backend 400s).
4. No confirmation dialog on destructive actions.
5. Save success doesn't navigate or refresh the dashboard list.
