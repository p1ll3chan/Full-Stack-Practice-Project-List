# Marygiri presentation redesign — Phase R0

Date: 2026-10-13. Branch: `style/amrita-inspired`, created from `style/teal-redesign`.
Status: study and plan; implementation awaits the user's `continue`.
This document lives beside `docs/DESIGN.md` in the frontend project. It is the
only tracked file changed in R0. No dependencies, application code, tests, data,
or source photographs are changed in this phase.

## 1. Evidence and reference study

### Marygiri photographs

The user confirmed that “Archieve” means
`/home/p1ll3chan/Documents/Projects/Work/Institute_WS/Achieve`.
All five PNG files were opened and visually inspected. These are photographs,
not screenshots of page layouts: they establish imagery and placement, not
header, tabs, carousel, footer, or motion behaviour.

| File | Observed content | User assignment and planned treatment |
| --- | --- | --- |
| `Shot-2026-10-12-110126.png` | Campus entrance framing the college building, garden and Marygiri signage | Main page hero. Preserve the entrance and signage in the crop; use a separate teal text area or sufficiently opaque overlay. |
| `Shot-2026-10-12-110148.png` | Students writing in a classroom | Academics overview/program explorer imagery. Do not imply a specific course or student identity. |
| `Shot-2026-10-12-110136.png` | Speaker at a lectern facing an auditorium gathering | Faculty page/section banner. This is contextual imagery, not a portrait of any faculty record. |
| `Shot-2026-10-12-110211.png` | Students using desktop computers in a lab; visibly soft image | Awards/Achievements, represented by existing Excellence pages. Use as a modest section image, never as evidence of a particular award. |
| `Shot-2026-10-12-110223.png` | Students gathered around a carrom board | “Last page”: provisionally the closing home-page CTA band above the footer, with a student-life image; no new route or invented sports achievement. |

The images are approximately 780 × 520 pixels, so avoid oversized full-screen
crops that exaggerate softness. Reserve aspect ratios and explicit dimensions;
eager-load only the main hero and lazy-load supporting photography. In R3/R4,
copy the user-approved assets into `src/assets/` with descriptive names; retain
the originals. Their assignment is explicit permission to use these existing
repository-root photographs. Do not use Amrita imagery or generate substitute
images. `src/assets/hero.png` also exists, but its filename alone does not prove
its subject or suitability; the supplied, inspected photos take precedence.

### Live Amrita study

Sources: [home page](https://www.amrita.edu/) and
[program page](https://www.amrita.edu/program/b-sc-psychology-hons/).
Both were read through web browsing and inspected in installed headless Chrome
at 1440 × 1000. Screenshots of the hero, scrolled header, menu, academics panel,
footer and program page were opened. DOM/computed-style inspection supplemented
the screenshots. No site code or assets are copied into the application.

Observed patterns:

- **Header:** home initially uses an overlaid brand, admission action and menu
  button; scrolling produces a compact bar. The program page has utility and
  primary rows. Marygiri will adopt the requested two-tier version consistently.
- **Mega-menu:** clicking the home menu opens a large rounded white panel over a
  dark surround. Hovering Academics did not switch it in this sample; clicking
  did. The panel has degree groups, subject groups, then course links. The About
  panel pairs introductory text with a roomy grid of short descriptive links.
- **Tabs:** the program page has a horizontal section-navigation row that stays
  below the compact header; its curriculum also groups content by semester.
- **Carousel:** the home hero has a thumbnail/caption controller and previous/
  next arrows. Its media changed between captures. Marygiri will use a static
  hero and a manually controlled department rail.
- **Link grid:** the home subject area uses a generous icon-and-label grid.
- **Footer:** a dark, multi-column directory separates link groups and a final
  legal/social row. Marygiri will use its much smaller, existing link inventory.

Motion evidence: computed styles show header padding/logo-size transitions of
350ms, menu transform transitions of 500ms, and admission decoration transforms
of 800ms. Scrolled screenshots confirm the header's changed size/surface.
These establish ideas, not measured frame-by-frame timing or an accessibility
audit. Touch, keyboard behaviour, easing curves in operation, and precise
carousel cadence were not verified. Marygiri's shorter motion budget overrides
the reference's timings and animated layout properties.

### Current application evidence

Inspected `src/routes.tsx`, `App.tsx`, public pages, shared cards, `Hero`,
`Header`, `Footer`, API hooks/types, tokens, design documentation and footer
tests. The existing site already provides CMS page blocks, teal gradients,
chevron dividers, Montserrat/Inter, list/detail cards and contact fallbacks.

This is a source/contract inventory, not proof that every collection currently
contains published records. Rendering must depend on returned data, never test
fixtures or seed assumptions. No backend writes or live data changes are needed.

## 2. Design direction and section map

Keep primary `#0E6E5F`, all existing colour tokens and Marygiri's identity from
the contact record. Extend tokens for motion, elevation, spacing and stacking.
Use large headings, broad photographic bands, generous white space, teal section
dividers and clear grouped navigation. No Amrita red, logo, copy, assets or code.
Existing generic fallbacks must not be replaced with invented institutional data.

Home order is fixed below. An empty optional home section is omitted after its
data resolves. Loading/error presentation remains truthful and retryable where
the existing hook provides retry; failures must not appear as fabricated content.
Dedicated list pages retain their existing loading/error/empty/filter feedback.

| Reference pattern / order | Marygiri equivalent and existing source | Availability rule / destination |
| --- | --- | --- |
| Utility + primary header | `Header`, `useContact().collegeName`; existing Contact, Faculty, Admin utility links; Home, About, Departments, Academics, Excellence primary links | Preserve all current destinations. Apply stays `/contact`; no admissions service exists. |
| Academic mega-menu | `useAllStreams()` or existing `useStreamList` inventory, `useDegreeLevelList`, `useCourseList`; course `streamId` / `degreeLevelId` relationships | Department-first two-column layout is the simplest supported mapping. Show fetched names only; link to the existing department and course routes. No extra endpoints. |
| 1. Photographic hero | `usePageBySlug('home')` through `CmsSection`; page title, contact tagline, existing CTAs; entrance photo | Uppercase is CSS presentation. Preserve title/document-title and CMS block content; no new marketing claims. |
| 2. About statement + link cards | Published home/about heading or paragraph blocks; department `name`, `tagline`, `shortDescription`; existing section routes | Reuse actual text, with no invented one-line descriptions. Omit absent statement/cards; preserve remaining published blocks in their order. |
| 3. Programs explorer | `useDegreeLevelList({ limit: 50 })`, `useCourseList({ limit: 100, sort: 'sortOrder' })`; stream inventory if department grouping is needed | Tabs for populated degree levels, otherwise populated departments. Null/unmatched relations remain available under All. Classroom photo; `/academics` links to the full existing listing. |
| 4. Department carousel | Existing home `useStreamList({ limit: 6, sort: 'sortOrder' })`; `DepartmentCard` | Keep current six-item preview/query. Link to `/departments`; hide rail if empty and controls when there is no overflow. |
| 5a. Faculty highlights | `useFacultyList` using the existing public listing parameters; `FacultyCard` | Slice the returned records for presentation without altering the API contract. Auditorium image is a section banner, never a member photo. `/faculty` and `/faculty/:id`. |
| 5b. Excellence highlights | `useExcellenceDomains({ limit: 50 })`, `useExcellenceList({ limit: 12, sort: 'year', order: 'desc' })`; domain/item cards | Actual domain names, descriptions, item titles and years. Lab photo supports this section. Hide empty subgroups. `/excellence`, `/excellence/domains/:slug`. |
| 6. Apply/closing band | Existing Apply link to `/contact`, contact name/tagline and user-assigned carrom photograph | Chevron divider; no invented admission dates, promise, form or contact details. Omit optional copy when absent. |
| 7. Directory footer | Existing `Footer`, `useContact`, quick links | Preserve Phase 10 loading, error, empty, whitespace trimming, partial-field, safe-map and generic-name behaviour exactly. |
| List tabs and filter chips | Existing category/search/page state on Departments; degree groups on Academics; `StreamNav` on Faculty; domain navigation on Excellence | Keep existing request parameters, debounce, pagination and route semantics. Links styled as tabs remain links; actual in-place panels use ARIA tabs. |
| Detail section navigation + side CTA | Existing descriptions, `AcademicDetails.overview`, `programsHtml`, degree levels, courses, biographies, `DetailFacts`, `CourseNav` | Generate anchors only for rendered sections. Hide section nav if fewer than two meaningful sections. Preserve existing content rendering/sanitization and links. |
| Related-item grid | Existing department course data; existing stream/domain data where relationships are available | Exclude the current item. Do not invent relationships or add endpoints; skip where the detail page lacks available related records. |
| News, upcoming events, research, campus selector, alumni, placements, ranking badges, social accounts | No matching public typed collections/verified records in inspected sources | **skip**. Excellence is not relabelled as news or institutional rankings. |
| Institutional counters/count-up | No public institutional-statistics contract; `AdminStats` is administrative inventory | **skip**. Years, credits and partial-list lengths are not institutional statistics. Result counts remain actual list counts. |
| Enquiry form, fees/curriculum tables without corresponding data | No matching Marygiri feature/data contract | **skip**; keep existing Apply-to-Contact flow. Do not parse free text into invented structured facts. |

Hook implementations, API clients, query keys, caching and schemas remain
unchanged. New public presentations may consume existing public hooks as
explicitly requested; no direct fetch, new endpoint or media lookup is added.
Preserve current parameter sets wherever reused. Bounded lists (50/100 records)
must not be described as the entire institutional catalogue when metadata says
otherwise. Faculty/department media IDs alone are not image URLs; omit missing
card photos rather than guessing URLs or adding API requests.

## 3. Motion catalogue

Extend tokens: `--dur-fast: 150ms`, `--dur-base: 240ms`,
`--dur-slow: 450ms`, `--ease-out: cubic-bezier(.2,.7,.2,1)`.
Every animated item below uses that easing. Only `transform` and `opacity` may
animate. Colours, outlines, borders, shadows, sizes and visibility states change
instantly. Do not animate `height`, `padding`, `top`, `filter` or grid tracks.

| Animation | Trigger | Properties / range | Duration / sequencing | Reduced-motion fallback |
| --- | --- | --- | --- | --- |
| Section reveal | First intersection, one shot | Opacity 0→1; translateY 16px→0 | 240ms | Fully visible immediately; no transform or delay |
| Card stagger | First intersection of grid/rail | Same reveal | 240ms; `--i` clamped to 0–7, delay 30ms × index; full sequence ≤450ms | All cards visible together |
| Header compact state | Scroll crosses 24px | Transform of visual wrapper; opacity of reserved shadow layer | 240ms | Instant compact state; no transform animation |
| Mega-menu entrance/exit | Click, Enter/Space, or deliberate fine-pointer hover | Opacity and translateY up to 8px | 150ms; desktop hover intent 150ms, cancelled on leave | Instant open/close; explicit activation always works |
| Mobile drawer/backdrop | Menu/close button, Escape, route change | Drawer translateX; backdrop opacity | 240ms | Instant state changes |
| Mobile accordion | Button/Enter/Space | Optional opacity of panel contents only | 150ms; panel layout changes instantly on user action | Instant expansion; no animation |
| Hero decorative chevron | Initial display, CSS only, once | Translate up to 8px; opacity | 450ms once | Static decoration; no autoplay/movement |
| Card arrow / image | Hover, focus within; touch press may show equivalent feedback | Arrow translateX 4px; existing image scale 1→1.04 | 150ms arrow, 240ms image | No transforms; focus ring/active colour changes instantly |
| Program panel cross-fade | Tab activation | Outgoing/incoming opacity | 200ms total, reserve panel area | Immediate selected panel |
| Department carousel | Previous/next, keyboard, native swipe | Native scroll-snap; no authored scroll-position animation | Instant button/keyboard scrolling; native touch movement has no authored duration | Instant controls; no smooth scrolling or autoplay |
| Result count update | Existing count changes | Opacity only; show actual final number | 150ms; polite announcement once | Immediate final count |
| Public page transition | Public pathname changes | View Transition old/new opacity only | 200ms; unsupported/error fallback is 200ms incoming fade | Bypass API and CSS animation entirely |
| In-page nav active state | IntersectionObserver scroll-spy or anchor activation | No animation; immediate active style | 0ms; anchor scroll instant | Identical instant behaviour |
| Footer / CTA reveal | First intersection | Standard reveal | 240ms | Fully visible immediately |

The requested “subtle slow drift” conflicts with the hard 450ms motion budget.
Default proposal: a one-shot 450ms settle, not an infinite slow loop. Native
scroll-snap is used without browser-defined smooth-scroll timing so the authored
motion budget remains enforceable. No count-up animation is planned.

### Progressive enhancement and layout stability

- `.reveal` is visible by default. Only successfully registered, offscreen
  elements may receive a JS enhancement state that temporarily hides them.
  Already-visible content, missing IntersectionObserver, observer failure,
  keyboard focus entering the element, print and reduced motion reveal
  immediately. Disconnect observers on completion/unmount. This prevents CSS
  from hiding content when JS fails; the existing client-rendered app itself
  does not gain server rendering in this task.
- Observe reduced-motion preference changes during the session. Disable all
  motion transforms, transitions, delayed reveals and page snapshots instantly.
  Replace existing public shimmer/colour/shadow/layout transitions that violate
  the budget. Keep admin behaviour and public-only motion scope separate.
- Reserve the outer header footprint; compact its visual contents without
  moving document flow. Sticky filter bars and detail navigation use shared
  header offsets, including narrow screens and long college names. Hidden
  utility links must never remain keyboard-focusable.
- Fixed image ratios, font sizing, loading slots and stable result/panel regions
  prevent animation-induced layout shifts. Overlaid outgoing tab content must
  be inert/hidden from assistive technology; focus stays on the selected tab.
- Page transitions must be a presentation boundary observing the existing
  location. Keep `BrowserRouter`, routes, query lifetimes and auth unchanged;
  no data-router migration, new route keys that refetch data, or navigation
  interception. If the View Transitions API cannot wrap the presentation update
  safely, use the documented fade fallback. Never duplicate interactive content
  in the accessibility tree or animate admin screens.

## 4. Interaction and accessibility contract

- Every control/link has visible `:focus-visible`, including stretched cards,
  menu categories, tabs, carousel controls, filter chips and drawer close.
  Minimum 44px targets. Preserve the skip link and one `h1` per page.
- Normal text ≥4.5:1; large text and UI boundaries ≥3:1. Use primary/dark teal
  for text. Accent/light teal remain decorative. Check image overlays against
  the darkest/lightest crop and both focus-ring backgrounds.
- Desktop navigation uses a disclosure button with `aria-expanded` and
  `aria-controls`, semantic navigation links and category buttons. Enter/Space
  toggles; Up/Down moves categories; Right enters courses; Left returns;
  Home/End reaches first/last in the current column. Escape closes and restores
  trigger focus. Tab remains natural with no focus trap. Outside pointer closes
  without stealing focus from the clicked control. Route change closes it.
- Hover intent is an optional enhancement for `(hover: hover)` and fine
  pointers only. Pointer can cross into the panel without it collapsing. Click,
  keyboard and touch expose every destination and category.
- Below 900px, use a full-height (`100dvh` with fallback) drawer with internally
  scrollable accordions. Save/restore body overflow and scroll position; focus
  the close button on opening and restore the trigger on cancellation. A modal
  drawer contains focus/background interaction while open; the desktop menu
  does not. On successful navigation, use page-heading focus rather than moving
  focus back to the old trigger. Clean up lock/focus state on unmount or resize.
- Program tabs have `tablist`, `tab`, `tabpanel`, linked IDs, `aria-selected`,
  roving tab index, Left/Right/Home/End and Enter/Space activation. Route links
  in `StreamNav` retain link semantics and `aria-current`.
- Carousel is a labelled region/list with previous/next buttons, disabled edge
  states and a focusable scroll area. Arrow keys work in the scroll area without
  hijacking page/form keys. Native touch pan, optional pointer drag with click
  suppression after an actual drag, no autoplay. All card links remain usable.

## 5. Components and pages

### New presentation components/hooks

| Phase | Proposed additions | Purpose |
| --- | --- | --- |
| R1 | `useInView`, `useHeaderScroll`; focused hook tests | One-shot visibility and threshold-only scroll state with cleanup; no render on every scroll pixel |
| R2 | `AcademicMegaMenu`, `MobileNavDrawer`, shared academic navigation content | Accessible desktop disclosure and mobile accordion using the same existing data |
| R3 | `Reveal`, `AboutLinkGrid`, `ProgramsExplorer`, `DepartmentCarousel`, `HomeHighlights`, `ApplyBand` | Compose data-backed sections; hide empty optional sections |
| R4 | `FilterChips`, `SectionNav`, `useSectionSpy`, `PublicPageTransition` | Presentation around existing state and routing; skip unsupported detail sections |

Names are proposed implementation boundaries, not new data abstractions. Prefer
small components; avoid duplicate hooks solely to draw the same section twice.

### Reused components/contracts

Rework markup/styles inside `Header`, `Hero`, `Footer`, `PageHeader`,
`DepartmentCard`, `CourseCard`, `FacultyCard`, `ExcellenceDomainCard`,
`ExcellenceItemCard`, `ResultsCount`, `StreamNav` and `CourseNav` without changing
their existing props contracts. Reuse `Pagination`, `DetailFacts`, `MediaImage`,
icons, states, `CmsSection`, `PageBlocks` and `RichText`. Retain CMS block order,
text formatting, accessibility labels, link destinations, existing exports and
safe rendering. Do not add image/section props to existing contracts just to fit
the design; use page-local composition or new presentation wrappers.

Extend `tokens.css`; put shell rules in `layout.css`, shared patterns in
`components.css`, public-page patterns and final reduced-motion overrides in
`public.css`. Preserve stylesheet import order. Do not restyle admin controls
through broad selectors or redefine legacy tokens in ways that change admin
behaviour. Existing tests stay unchanged unless removed markup truly requires
an assertion update, which must be reported specifically in that phase.

### Pages affected

- R2 shared shell: all routes displaying `Header`/`Footer`; they currently also
  surround admin routes. Keep Admin access, auth, forms and focus behaviour
  intact; disable public route/reveal effects on `/admin` and descendants.
- R3: `/` (`Home` and home composition), shared footer; supplied entrance and
  closing images plus data-backed faculty/excellence/program highlights.
- R4 lists: `/departments`, `/academics`, `/faculty`, `/faculty/streams/:slug`,
  `/excellence`, `/excellence/domains/:slug`.
- R4 details: `/departments/:slug`, existing alias `/streams/:slug`,
  `/academics/streams/:slug`, `/academics/courses/:id`, `/faculty/:id`.
- `/about`, `/contact`, `/:slug` and NotFound receive consistent public shell,
  typography and applicable transition treatment; keep content and behaviour.
  No new “last page”, award detail route or admissions page is introduced.

## 6. Phased delivery and validation

After **each** phase run from `frontend`:
`npm run lint && npm test && npm run build`.
Commit only that phase as `style(amrita-RN): <summary>`, report files, visual
checks and questions, then STOP until the user says `continue`.

| Phase | Deliverable | Added validation / what to eyeball |
| --- | --- | --- |
| R0 | This plan only | Review photo assignment, data map, proposed exceptions and scope; record baseline checks below |
| R1 | Token extensions, reveal styles and two hooks | Tests: one-shot observer, unsupported observer, reduced-motion, disconnect; 24px threshold and scroll cleanup. Verify JS failure/print visibility and public/admin style isolation. |
| R2 | Two-tier compact header, mega-menu, drawer | Tests: click/open/close, Escape/return focus, arrows, outside click, touch toggle, body-lock cleanup. Eyeball long names, 899/900px boundary and sticky offsets. |
| R3 | Ordered home sections and imagery | Check empty/partial/loading/error data, tab semantics, carousel edges/keyboard/touch, all CTA targets and unchanged contact fallback tests. |
| R4 | Public list/detail presentation | Check existing debounce/filter/page behaviour, URL/back navigation, tabs vs links, section spy, missing related data, transition fallback and reduced motion. |
| R5 | Responsive/accessibility/performance polish; update `docs/DESIGN.md`; remove dead CSS | 360, 390, 768, 1024, 1440px; no body overflow; 44px targets; keyboard walkthrough; real browser CLS observation; Lighthouse home + one list page. |

R5 reports Performance/Accessibility/Best Practices/SEO scores with browser,
viewport, build mode, data availability and tool version; fixes accessibility
findings and reports limitations. Measure layout-shift entries during initial
load and reveal/header/interaction passes, distinguish input-associated shifts,
and verify reveals add no shift. Automated scores do not replace keyboard,
touch, focus or reduced-motion checks.

Compare emitted JS and CSS using the same uncompressed build-output basis
against the user's baseline **JS 521.11 kB / CSS 38.19 kB**; report gzip separately
and identify image payload separately. No dependency may be added for the design
or its validation. Existing browser tooling can be used outside the app.

## 7. Review decisions and R0 checkpoint

Proposed defaults for approval:

1. Interpret “last page” as the closing home-page band above the footer using
   the carrom photo. If it means a specific existing route, adjust placement.
2. Resolve slow-drift versus 450ms conflict with the one-shot hero settle above.
3. Use the supplied photographs as section imagery, not as unverified portraits
   or achievement evidence. Keep Excellence as the existing Awards/Achievements
   destination.
4. Skip unsupported institutional stats/news/events and omit missing related
   grids; preserve all actual CMS content and footer fallbacks.

R0 validation: `npm run lint && npm test && npm run build` passed on 2026-10-13.
Vitest: **11 files, 67 tests passed**. TypeScript and Vite production build passed.
Emitted JS: 0.58 + 139.12 + 381.41 = **521.11 kB**; CSS: 3.49 + 34.70 =
**38.19 kB** (rounded emitted chunk sizes, uncompressed). Both match the supplied
baseline: **0.00 kB change**. No existing tests have been edited.
Live reference inspection is not validation of the future Marygiri
implementation. Temporary browser evidence is under
`/tmp/marygiri-r0-*.png` and is not a committed asset or durable dependency.

Pre-existing untracked files `../Achieve/` and
`backend/src/scripts/seedMarygiriContact.ts` are outside the R0 commit.
Next authorized phase after approval: R1 only.
