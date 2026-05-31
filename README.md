# DateLore

A fun, free site about dates — **on this day in history** + **the day you were born** + a daily history quiz.

- **Domain:** datelore.com
- **Stack:** Astro (static) + client-side TypeScript, hosted on Cloudflare Pages.
- **Data:** Wikimedia "On this day" feed — **CC BY-SA**, so Wikipedia attribution is required.
- **Design spec:** [`docs/superpowers/specs/2026-05-31-datelore-onthisday-design.md`](docs/superpowers/specs/2026-05-31-datelore-onthisday-design.md)
- **Visual brief (for Open Design):** [`design/datelore-open-design-brief.md`](design/datelore-open-design-brief.md)

## Develop

```sh
npm install
npm run dev      # local dev server
npm run build    # static build -> dist/
```

> **Status:** Foundation built — the visual design is live in the app with a unit-tested
> TypeScript core (zodiac/generation/birthstone, birthday math, daily-quiz selection) wired to a
> 4-date sample dataset. Day pages render at `/<month>-<day>` (e.g. `/may-31`). Still to come
> (later plans): the Wikimedia 366-date pipeline, JSON-LD, OG/share images, sitemap, and Ezoic ads.
