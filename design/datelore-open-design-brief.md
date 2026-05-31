# DateLore — New-Site Visual Design Brief

Paste this into Open Design's discovery form. This is a **brand-new site** (no existing
design to evolve) — domain **datelore.com**. Companion spec:
`docs/superpowers/specs/2026-05-31-datelore-onthisday-design.md`.

## What the site is
DateLore is a fun, free site about **dates**. Every calendar day has a page that answers
two things at once:
1. **"On this day in history"** — notable events, births, deaths, and holidays for that date.
2. **"The day YOU were born"** — type your birthday and get your zodiac, generation, day of
   the week you were born, exact age in fun units, famous "birthday twins," and a countdown
   to your next birthday.

Plus a **daily "Which year did this happen?" history quiz** (Wordle-style, one per day, with
a streak). Built in **Astro** (static, no React) — output must stay **lightweight,
static-friendly, accessible, and fast.** Visitors arrive bored/curious from Pinterest,
TikTok, and Google search — mostly on **mobile** — poke at their birthday, share a screenshot,
and rabbit-hole into other dates. Money comes from **display ads**, so the design must
gracefully accommodate ad slots and reward lots of page-to-page browsing.

## Mood & personality (this is the big difference vs a utility tool)
Think **"vintage almanac meets a birthday card meets a modern timeline."** Curious, warm,
celebratory, a little nostalgic — delightful and **screenshot-worthy**, NOT corporate or
clinical. People should *want* to pin/share their birthday card. Keep it tasteful and fast,
not flashy or heavy.

Good reference vibes: an old-timey almanac/ephemeris, editorial timeline pages, a tasteful
birthday/horoscope app, "year you were born" nostalgia posts.

## Brand starting point (Open Design should refine into a real token set)
- Suggested palette: warm **parchment/cream** background, deep **ink navy or aubergine** text,
  a **warm gold/amber** primary accent, plus one celebratory **pop** color for birthdays
  (e.g. coral or magenta). Open to alternatives — just keep it warm, inviting, and high-contrast.
- Type: one **characterful display serif** for headlines (almanac/editorial feel) + one clean
  **sans** for body/UI. (Max ~2 webfonts; fall back to system fonts gracefully.)
- Feel: rounded, friendly cards; subtle texture/ornament okay if it stays light and fast.

## Pages / components to design (this is the full anatomy — please style each)
1. **Header / nav** — "DateLore" wordmark + simple nav (Today · Your Birthday · Daily Quiz),
   plus a small date/birthday quick-input.
2. **Homepage** — a hero centered on **TODAY'S date** ("On This Day — May 31"), a prominent
   **birthday input** ("Enter your birthday →"), a **daily-quiz teaser card**, and a teaser of
   today's top events/famous births.
3. **Day page** (the core page, 1 per calendar day) — the showpiece. Needs:
   - A bold **date header** + share button.
   - A **timeline-style list of historical events** (year markers down the side).
   - **"Famous birthday twins"** — a row/grid of notable-people **cards** (name, year, one line).
   - Smaller **deaths** and **holidays/observances** sections.
   - **Zodiac + birthstone + birth-flower badges** for that date.
   - A **"born on this day?" CTA** into the birthday tool.
4. **Birthday result** — personal **stat cards** with big-number readouts (age in years/days/
   hours, day of week born, zodiac, Chinese zodiac, generation, next-birthday countdown). Should
   look like a shareable **birthday card**.
5. **Daily quiz card** — a clean multiple-choice "Which year?" card with 4 options, a result/
   reveal state, and a **streak** indicator.
6. **Share / OG card** — a self-contained, screenshot-ready card design ("Born on May 31?" /
   "Today in History") sized for Pinterest (tall) — this is a key growth lever.
7. **Footer** — links + a clear **"Data from Wikipedia (CC BY-SA)" attribution** block (required).
8. **Ad slots** — show where in-content display-ad blocks live so ads don't wreck the layout.

## What I want back from Open Design
A reusable visual system I can port to Astro:
- A complete **token set** (colors, type scale, spacing, radius, shadows) as CSS custom properties.
- Styled components for every item in the anatomy above.
- **Mobile-first**, strong tap targets, clear hierarchy; the day page and birthday result must be
  genuinely **share/screenshot-worthy**.

## Hard constraints (so it ports back cleanly to Astro)
- Plain **HTML + CSS** (CSS custom properties). **NO Tailwind, NO React**, no JS framework — static Astro.
- Keep CSS small and **fast** (Core Web Vitals matter for SEO + ads). Max ~2 webfonts.
- **WCAG AA** contrast; accessible form labels, focus states, and semantic structure (h1/h2, lists, tables).
- Leave clean, non-intrusive room for **display-ad slots**.
- Restyle/structure freely — but it has to render as lightweight static markup, not a SPA.
