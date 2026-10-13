# Marygiri presentation redesign — completion record

Validated 2026-10-14 on `style/amrita-inspired`, based on `style/teal-redesign`.
The user explicitly authorized proceeding without phase approval pauses.

## Delivery

| Phase | Commit | Main files / outcome | Visual review target |
| --- | --- | --- | --- |
| R0 | `67280b5` | `docs/REDESIGN-PLAN.md`: all five supplied photos, live reference observations, data mapping and motion catalogue | Photo assignments and skipped sections |
| R1 | `f1e76e0` | tokens, viewport/scroll hooks, reveal CSS and hook tests | Offscreen reveal, reduced motion and compact header |
| R2 | `0e83963` | Header, AcademicMegaMenu and header tests | Desktop menu arrows/Escape; mobile accordion and focus return |
| R3 | `c135044` | Five local assets, hero/home composition, program explorer, carousel, highlight/CTA sections and footer reveal | Entrance hero, classroom, auditorium, laboratory and carrom images |
| R4 | `8dfdaa3` | Public lists/details, PagePhoto, SectionNav, ResultsCount and PublicPageTransition | Sticky filters, section anchors, hover/focus cards and related department |
| R5 | This completion commit | Route focus/transition cleanup, motion edge-case tests, target sizing, dead CSS removal, browser audit script and design/QA documentation | Mobile drawer, keyboard/touch carousel, route focus and reduced motion |

User checkpoint `4afa195` also includes interim R5 polish (reserved loading
geometry, program crossfade, drawer close/focus ordering). It is preserved.
Fetching implementations, query keys, routes, auth, schemas, API contracts and
admin behaviour were not redesigned. No application dependency was added.

The original PostgreSQL connection refusal was resolved by starting the existing
`college-cms-db` container. Health returned `database: connected`; no database
reset or destructive migration was used. Browser checks use existing local data.

## Checks

- Final `npm run lint && npm test && npm run build`: passed; **14 files / 78 tests**.
- Existing tests changed only where removed markup required it: `routes.test.tsx`
  now checks “Explore departments” instead of “Browse Academics”; `phase5.test.tsx`
  checks that an empty optional home department section is hidden. Existing
  footer fallback tests remain passing. Added hook/header/program tests.
- Browser audit: **48/48 checks passed**. Chrome 145.0.7632.77, real local API, dev site: home, departments, academics,
  faculty and excellence each checked at **360, 390, 768, 1024 and 1440px**.
  All 25 checks passed with no horizontal document overflow.
- Entrance image loaded at all five widths. All five supplied photographs loaded
  on the homepage. Desktop/mobile hero, desktop closing band and mobile drawer
  screenshots were visually inspected.
- Keyboard: menu open, department/course arrow navigation, Escape/focus return,
  program tab selection, carousel scroll and category filter activation passed.
  Filter focus ring was present. Mobile drawer contained focus over 16 Tab steps;
  accordion activation, Escape, focus restoration and body scroll unlock passed.
- Browser-emulated touch opened/closed the drawer and swiped the carousel
  (`scrollLeft` changed from 4 to 336). This is not a physical-device test.
- Reduced motion: all reveal content visible with no transform; hero static.
  Observer failure and enabling reduced motion mid-session are covered by tests.
- Public controls use 44px minimum targets; stretched card links cover the card.
  Header and card navigation remain available without hover.
- Reveal-only scroll pass: accumulated CLS stayed **0.0000900022 → 0.0000900022**,
  i.e. no added layout shift. Reserved images/loading geometry retain their space.

Reproduce the browser checks with an existing Chrome debugging port at 9223:
`node scripts/check-presentation.mjs` from `frontend` (Node with WebSocket support).
Default site is `http://127.0.0.1:5173`; override `BASE_URL` if needed.
Temporary screenshots and machine-readable results: `/tmp/marygiri-qa/`.
No browser package is required by the app. Reuse each loaded route when checking
widths to avoid flooding the existing API rate limit.

## Lighthouse and bundle

Production preview at `http://127.0.0.1:4173`, Lighthouse 13.5.0, Chrome 145,
mobile 412×823 / DPR 1.75, simulated 4× CPU and 1.6 Mbps network.
Scores are local measurements and vary between runs; they do not prove complete
WCAG conformance or physical-device support.

| Page | Performance | Accessibility | Best practices | SEO | CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home | 75 | 100 | 100 | 92 | 0.000232 |
| Departments | 95 | 100 | 100 | 91 | 0.015288 |

No failing automated accessibility audit on either page. Original PNG payload,
existing initial JS and font loading remain performance opportunities. SEO's
robots.txt finding is from the local preview's SPA fallback; hosting configuration
was not changed. Reports: `/tmp/marygiri-lh-home.report.html` and
`/tmp/marygiri-lh-departments.report.html` (JSON companions alongside).

| Emitted assets | Baseline | Final | Change |
| --- | ---: | ---: | ---: |
| JavaScript, uncompressed | 521.11 kB | 540.58 kB | +19.47 kB (+3.74%) |
| CSS, uncompressed | 38.19 kB | 52.90 kB | +14.71 kB (+38.52%) |

Final gzip totals: JS **148.70 kB**, CSS **11.10 kB**. Five original PNGs total
**2652.85 kB**, separately from JS/CSS; the hero is eager, other photos lazy.
No invented stats, count-up, news or events were added. The hero has one 450ms
settle rather than continuous drift, respecting the motion budget.

## Remaining review

No implementation question blocks delivery. Review the real CMS wording and
image crops at `/`, `/academics`, `/faculty` and `/excellence`; these remain the
college's editorial choices. Physical-device and cross-browser acceptance are
still useful beyond the Chrome automation. The design guide records the rules
for new sections and preserving footer fallbacks.
