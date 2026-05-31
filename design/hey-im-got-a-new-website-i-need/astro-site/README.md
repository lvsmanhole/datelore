# DateLore — Astro site

The DateLore visual system, ported from the standalone HTML prototypes into a
runnable **static Astro** project. No React, no Tailwind, no client framework —
just HTML, CSS custom properties, and one dependency-free vanilla script.

## Run it

```bash
cd astro-site
npm install        # fetches Astro (needs network — run this on your machine)
npm run dev        # http://localhost:4321
npm run build      # -> dist/ (pure static HTML/CSS/JS)
npm run preview    # serve the built dist/
```

## How the prototype maps to Astro

| Prototype file            | Astro file                          | Notes |
|---------------------------|-------------------------------------|-------|
| `styles.css`              | `src/styles/global.css`             | verbatim, imported once in the layout |
| `datelore.js`             | `src/scripts/datelore.js`           | verbatim, deferred via the layout |
| repeated header / footer  | `src/components/Header.astro` / `Footer.astro` | sliced out once |
| `<head>` + page shell      | `src/layouts/BaseLayout.astro`     | owns title/meta/OG/font/script |
| `home.html`               | `src/pages/index.astro`             | `/` |
| `birthday.html`           | `src/pages/birthday.astro`          | `/birthday` |
| `quiz.html`               | `src/pages/quiz.astro`              | `/quiz` |
| `share-card.html`         | `src/pages/share.astro`             | `/share` |
| `day.html` (×366)         | `src/pages/day/[date].astro`        | one template → one static page per date |
| per-date content          | `src/data/dates.js`                 | `{ "05-31": { events, births, … } }` |

## The payoff: `day/[date].astro`

`getStaticPaths()` stamps out one **static HTML page per date** at build time
from `src/data/dates.js`. Add a date's data → you get `/day/MM-DD/` for free.
Wire `dates.js` to your Wikipedia (CC BY-SA) pipeline and the whole calendar
builds itself.

## Notes for production

- **Fonts / Core Web Vitals.** The Google Fonts `<link>` works as-is. To kill a
  render-blocking round-trip, self-host: `npm i @fontsource-variable/newsreader`
  then `import "@fontsource-variable/newsreader"` in `BaseLayout.astro` (the CSS
  already has system fallbacks, so it's a safe swap).
- **Ad slots** stay as plain server-rendered markup
  (`.ad-slot--leaderboard / --rectangle / --rail / --inline`). Drop your ad
  network's loader in with `<script is:inline>` so Astro doesn't bundle it.
- **Static output** is the default — nothing in `astro.config.mjs` opts into SSR.
