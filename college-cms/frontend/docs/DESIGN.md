# Design system — Marygiri College of Arts and Science (College CMS frontend)

Single source of truth for the visual language of the public site and the admin.
All styling is plain CSS; no CSS framework. Every rule lives under `src/styles/`
and is imported, in cascade order, from `src/index.css`.

## Stylesheet structure

`src/index.css` is an entry file that only imports, in this exact order:

| File | Contents |
| --- | --- |
| `src/styles/tokens.css` | `:root` design tokens (colour, radius, shadow, spacing, type, layout, motion) |
| `src/styles/base.css` | Reset, element defaults, focus ring, skip link, visually-hidden utility |
| `src/styles/layout.css` | Site shell: header, hero, dividers, footer, card grid, stat strip |
| `src/styles/components.css` | Buttons, badges, chips, form controls, states, media, nav lists, filter bar, pagination |
| `src/styles/admin.css` | Admin shell, sidebar, tables, save bar, login |
| `src/styles/public.css` | Public page patterns: cards, list toolbar, detail pages, prose, skeletons, print, reduced-motion |

Rules are **contiguous slices** of the pre-split stylesheet — do not reorder
blocks across files without checking the cascade. `print` and
`prefers-reduced-motion` blocks must stay in `public.css` (last import): they
override earlier rules in their own media contexts.

## Palette

| Token | Value | Role | Contrast notes |
| --- | --- | --- | --- |
| `--color-primary` | `#0E6E5F` | Brand teal: header, buttons, links, focus ring | 6.15:1 on white — AA text |
| `--color-primary-dark` | `#0A5247` | Deep teal: topbar, gradients start, active admin nav text | 9.09:1 on white |
| `--color-primary-light` | `#17907A` | Decorative only (SVG fills) | 3.96:1 — large/UI only, never small text |
| `--color-accent` | `#2BAE9A` | Decorative chevrons/marks only | 2.75:1 — never text or focus rings |
| `--color-ink` | `#1B2B28` | Body text | 14.76:1 on white |
| `--color-muted` | `#5B6B68` | Secondary text | 5.60:1 on white |
| `--color-surface` | `#FFFFFF` | Cards, sidebars | |
| `--color-surface-soft` | `#EEF6F4` | Soft teal tint: bands, table headers, hovers | |
| `--color-bg` | `#F7FAF9` | Page background, zebra rows | |
| `--color-border` | `#D5E6E2` | Decorative borders (cards) | not a UI boundary |
| `--color-border-strong` | `#B9D3CD` | Decorative dashes/rings | not for inputs |
| `--color-border-input` | `#7A918B` | Input/select/textarea borders | 3.36:1 on white (WCAG 1.4.11) |
| `--color-danger` / `danger-bg` | `#B3262E` / `#FDECEE` | Errors, destructive actions | 5.69:1 |
| `--color-success` / `success-bg` | `#166534` / `#DCFCE7` | Active/published badges, saved state | 6.49:1 |
| `--color-warning` / `warning-bg` | `#854D0E` / `#FEF9C3` | Draft badges | 6.38:1 |
| `--hero-gradient` | `135deg, primary-dark → primary` | Hero, login screen | white text ≥ 6.15:1 everywhere |

Contrast rule: any text pair must reach 4.5:1 (normal) or 3:1 (large ≥18.66px
bold / ≥24px, and non-text UI such as focus rings and input borders). Check with
the WCAG formula before adding a colour to text use.

## Other tokens

- Radius: `--radius-sm` 8px (controls), `--radius-md` 12px (cards, frames).
- Elevation: `--shadow-card`, `--shadow-hover` (soft teal-tinted shadows).
- Spacing: `--space-1..8` = 4px scale.
- Containers: `--container-public` 1040px, `--container-admin` 1200px.
- Motion: `--transition` 200ms ease; all transitions must be removed under
  `prefers-reduced-motion: reduce`.
- Section padding: `--section-pad` clamp(40px … 96px).

## Typography

- Headings: `"Montserrat Variable"`, weights 700; sizes via `--text-h1/h2/h3`
  clamps (ratio 1.25). Body: `"Inter Variable"` 1rem/1.6.
- `h1` exactly once per page (via `PageHeader`); sections are `h2`, cards `h3`.
  If a card grid appears directly under the page `h1`, add a
  `visually-hidden` `h2` label.
- `.eyebrow`: 0.8rem, 600, uppercase, letter-spacing 0.08em, `--color-primary`.
- Long-form CMS content: wrap in `.prose` (68ch measure, styled lists,
  blockquotes, tables).

## Component class reference

### Buttons
`.btn` (outline, default) · `.btn-primary` (solid teal) · `.btn-danger`
(solid red, destructive) · `.btn-sm` (compact, tables). All buttons:
min-height 44px (36px with `btn-sm`), radius-sm, 600 weight, hover tint,
white focus ring on teal surfaces. Never use a bare `<a>` as a button.

### Chips / badges
`.chip` (44px pill, neutral) inside `.chip-row`; on ≤720px chip rows become a
horizontal scroll strip. Status badges: `.badge` + `.badge-live` (green) or
`.badge-draft` (amber). Inline elements; no interaction.

### Cards
Grid: `<ul class="card-grid">` → `<li>` → `<article class="course-card |
faculty-card | dept-card | domain-card | excellence-card">`. Exactly **one**
link per card: the title, class `card-stretched`; its `::after` covers the
whole card and the ring is drawn with `:has()` on the article. Title `h3.card-title`
(2-line clamp), eyebrow `span.card-eyebrow`, footer `.card-footer` with
`.card-cta`. Never add a second link (Read more, image link, …).

### Forms
`.field` wraps `label` + control (+ `.field-hint`, `.field-error` with
`role="alert"`). Invalid wrapper: `.field-invalid`. Two-column grouping:
`.form-grid`. Admin editors: `.admin-card` > `h2` > `form.admin-form` … >
`FormSaveBar` (sticky `.save-bar` with `.save-status save-saving|save-saved|save-error`).
All controls ≥44px; visible labels or `visually-hidden` label for icon-only inputs.

### Skeletons / states
`.skeleton-card` (min-height 220px) with `.skeleton-line` variants inside
`.card-grid-loading` (`role="status"` + visually-hidden label). Standalone:
`.skeleton`. States: `.state-card`, `.empty-state`, `.error`, `.loading-state`,
`.not-found` — all render through `components/states.tsx`.

### Dividers / media
Chevron divider: `.divider-chevron` (`.divider-chevron--hero` for gradient);
slant: `.divider-slant`. Pure CSS shapes; hidden in print. Images via
`MediaImage` → `.media-frame` (radius-md, soft bg) or `.media-fallback`
(dashed placeholder, min-height 140px); captions `.content-image figcaption`,
`.gallery-item figcaption`. Fixed-ratio containers must set `aspect-ratio`.

### Detail pages
`.detail-band` (full-bleed tinted header + breadcrumb) > `.detail-layout`
(2-col: `.detail-main` + sticky `.detail-side` with `.fact-list` and
`.detail-cta`); collapses to one column ≤720px.

## Rules for adding a new page

1. **One `h1`** via `PageHeader` (title, optional eyebrow/subtitle,
   breadcrumbs). Document title must stay `"<Title> | College CMS"` (use
   `usePageTitle`).
2. Use existing tokens and component classes; add new classes only for genuinely
   new patterns, appended to the right `src/styles/` file (public pages →
   `public.css`). Never hardcode a colour, radius, or spacing value.
3. Lists: `<ul class="card-grid">` of cards; add a `visually-hidden` `h2` if the
   grid sits directly under the page `h1`. Loading/empty/error via `states.tsx`.
4. Interactive elements: visible focus (`:focus-visible` global ring; white ring
   on teal surfaces), ≥44px target, real `<button>`/`<a>` semantics.
5. Responsive: verify 360 / 390 / 768 / 1024 / 1440; no horizontal body scroll
   (`overflow-x: clip` on body guards `.bleed` full-bleed sections).
6. Tests: assert roles, text, labels, `href`, `document.title` — never class
   names or colours.
7. Before finishing: `npm run lint && npm test && npm run build`, then eyeball
   print output (Ctrl+P) and reduced-motion if you touched animation.
