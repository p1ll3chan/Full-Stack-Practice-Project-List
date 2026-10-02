# `public/` — Static assets served as-is

Files here are copied **verbatim** into the build output (`dist/`) and served
from the site root. No import, no processing, no hashing.

| File | Referenced by |
| --- | --- |
| `favicon.svg` | Browser tab icon (auto-linked by Vite) |
| `icons.svg` | SVG sprite sheet — `<use>` references |
| `_redirects` | Netlify / Cloudflare Pages SPA fallback (`/* /index.html 200`); ignored elsewhere. Vercel uses `../vercel.json`, nginx uses `try_files` (see `../../DEPLOYMENT.md`) |

## `public/` vs `src/assets/`

| | `public/` | `src/assets/` |
| --- | --- | --- |
| URL | `/favicon.svg` (fixed path) | hashed filename, e.g. `/assets/hero-a1b2c3.png` |
| Import in code? | No — just write the path string | Yes — `import hero from './assets/hero.png'` |
| Processed by Vite? | No | Yes (optimized, fingerprinted) |
| Use for | favicons, `robots.txt`, files needed at a stable URL | images used inside components |

Current usage: `src/assets/hero.png` is imported by components, while the
SVGs sit in `public/`.

## Note

Neither SVG is currently referenced by any component — `icons.svg` in
particular would need markup like:

```html
<svg><use href="/icons.svg#icon-name"></use></svg>
```

Worth wiring up or removing.
