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

> **Status:** initial scaffold only. The visual design (Open Design pass), the 366 day-page
> engine, the birthday tool, and the daily history quiz are not built yet — see the design spec.
