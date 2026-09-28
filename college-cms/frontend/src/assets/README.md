# `assets/` — Images and graphics imported by components

Unlike `../public/`, files here go **through Vite's build pipeline**: they
get optimized, cache-busted with a hash in the filename, and referenced
correctly in both dev and production.

## Importing (the correct way)

```tsx
import hero from '../assets/hero.png'
// ...
<img src={hero} alt="..." />
```

Vite turns that import into a URL string at build time:
`/assets/hero-a1b2c3d4.png`. Never hardcode `/assets/hero.png` — the hash
means the filename changes on every rebuild.

## Files

| File | Purpose |
| --- | --- |
| `hero.png` | Hero/banner image |
| `react.svg` | React logo |
| `vite.svg` | Vite logo |

> The two SVGs are likely leftovers from the Vite starter template and don't
> appear to be referenced by current components — safe to delete once you
> confirm.

## When to put a file here vs `../public/`

- **Component uses it in JSX** → `assets/` (import it)
- **Needed at a fixed URL** (favicon, `robots.txt`) → `public/`
