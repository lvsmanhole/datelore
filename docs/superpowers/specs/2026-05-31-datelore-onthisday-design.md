# DateLore — "On This Day" + Birthday Engine — Design Spec

- **Date:** 2026-05-31
- **Status:** Approved (design); pending spec review → implementation plan
- **Author:** Claude + owner (tailormade.gibson@gmail.com)
- **Brand / domain:** **DateLore** — **datelore.com** (confirmed available 2026-05-31)
- **Relationship to BackyardCalc:** a **new, standalone site and repo**, separate from
  `project-estimators`/BackyardCalc. It deliberately **reuses BackyardCalc's proven patterns**
  (Astro static site, tested pure-TS core, catalog/registry-driven pages, Cloudflare Pages free
  hosting, JSON-LD/OG SEO, Ezoic ads) but shares no code, brand, or git history.

## 1. Goal

A second mostly-passive ("residual") income asset, in a **broad casual "bored-browsing" niche**
rather than high-intent utility. DateLore answers two faces of every calendar date from one
dataset:

1. **"On this day in history"** — the daily-return hook (the homepage always shows *today*).
2. **"What happened the day *you* were born / who shares your birthday"** — the personal,
   highly-shareable hook that drives high pages-per-session.

Success = a low-maintenance, self-refreshing site of **366 evergreen day pages + a birthday tool
+ a daily history quiz**, monetized by display ads, that compounds traffic over 12–18 months at
**1–3 hrs/week** of owner time.

## 2. Operator division (same framing as BackyardCalc)

- **Claude (engineer/operator-assistant):** builds the site, data pipeline, tools, automation,
  deploy setup; monitors/advises.
- **Owner (business of record):** owns the domain, Cloudflare/Ezoic/affiliate accounts, money, and
  final publish approval; provides the initial off-page/social push (Pinterest/TikTok birthday
  content) that turns "built" into "earning."

## 3. Constraints

| Constraint | Value |
|---|---|
| Startup budget | ~$12/yr domain; $0 hosting (Cloudflare Pages). No paid APIs or data. |
| Ongoing owner time | 1–3 hrs/week |
| Stack | Astro static site + client-side TypeScript; no backend, no DB, no server runtime |
| Monetization | Display ads (Ezoic) — entertainment-tier RPM (~$4–5); volume + repeat-visit play |
| Data | Must be free + redistributable; daily-fresh must be self-maintaining |

## 4. Niche & strategy rationale

"Bored-browsing" traffic is low-intent, so it earns mainly from **display ads at scale** — the bet
is **volume + repeat visits**, not high-value clicks. Research (2026-05-31, four parallel niche
sweeps) found that almost every memorable head term in this space is portal-locked (LingoJam,
wheelofnames, Calculator.net, Merriam-Webster, Emojipedia, BuzzFeed, uQuiz, JetPunk, 16Personalities).
The **"on this day" + birthday** cluster was the standout survivor (independently surfaced by two of
the four research lanes) because it uniquely clears every constraint:

- **Winnable SERP:** the date/birthday long-tail is held by small indies and low-effort scrapers
  (playback.fm, backthennow, bornglorious, MuffinLabs, byabbe.se) + Wikipedia — not a fortified portal.
- **Self-maintaining daily-fresh:** the homepage literally *is* today's date and changes for free,
  forever — ideal for a 1–3 hr/week owner who wanted "daily/automated fresh."
- **Free, redistributable data:** the Wikimedia "On this day" feed (below).
- **Broad casual + shareable demand:** "the year you were born," "famous people born on my birthday,"
  and "what generation am I" are evergreen and actively trending on Pinterest/TikTok.
- **High pages/session:** people check their date, then a partner's, kids', friends'.

**Honest base rate:** like BackyardCalc, most no-edge content sites fail and SEO traction takes
3–9 months. RPM here is *lower* than home-improvement, so this only works on breadth (366 pages),
repeat visits (daily hook + quiz streak), and social inflow. Breadth + the daily hook are the moat.

## 5. Product design

### 5.1 Page archetypes

1. **Day pages (366, the core traffic + money pages):** one per calendar day at `/<month>-<day>`
   (e.g. `/may-31`). Each page serves *both* "what happened on May 31" **and** "born on May 31":
   - **On this day:** notable historical **events**, **births**, **deaths**, and **holidays/observances**
     (from Wikimedia), with links + attribution.
   - **Born on this day:** "famous birthday twins" (the notable-births list, framed personally),
     plus the **zodiac sign**, **birthstone/flower** (static reference tables), and a CTA into the
     birthday tool.
2. **Birthday tool (`/birthday`, the personal/viral hook):** enter a birthdate → routes to that day
   page and computes deterministic personal stats client-side (§5.3).
3. **Homepage (`/`, the daily-return hook):** detects *today* client-side and surfaces today's day
   page content + the daily quiz + a birthday-input box.
4. **Daily quiz (`/quiz`, also embedded on the homepage; in MVP per owner decision):** "Which year
   did this happen?" — a Wordle-style once-per-day history quiz generated from the same dataset,
   with a localStorage streak.

**URL slug decision:** day pages use a readable month-name slug, `/<month-name>-<day>` (e.g.
`/may-31`), not numeric `/05-31` — better for readability and for matching searches like
"may 31 in history."

### 5.2 Tech stack (cheap + low-maintenance, mirrors BackyardCalc)

- **Astro static site**, **Cloudflare Pages** ($0), git push → auto-build → auto-deploy.
- **Tested pure-TS core** (Vitest) — the BackyardCalc discipline:
  - Build-time **data pipeline** fetches Wikimedia for all 366 month-days *once*, transforms +
    cleans → **static JSON baked into the build** (committed to the repo as the source of truth so
    builds are reproducible and offline). **No runtime API calls.**
  - Deterministic **personal-stat functions** and **quiz-selection functions** — pure, unit-tested.
- **Catalog/registry pattern:** the 366 days come from generated data; reference tables (zodiac,
  birthstones, generations) are small typed modules. Page templates are catalog-driven (one
  `[day].astro` dynamic route over the 366-entry dataset), exactly like `calculators/[slug].astro`.
- **No backend, no database, no accounts, no stored user results.** Everything personal is computed
  client-side from the entered date.

### 5.3 Birthday tool — deterministic personal stats (pure client-side date math)

All derived from the entered birthdate; no data lookups beyond static reference tables:

- Exact **age** in years/months/days, and "age in everything" (days, weeks, hours, heartbeats-style fun units).
- **Day of week** you were born ("born on a Tuesday").
- **Western zodiac** + **Chinese zodiac** (lookup tables).
- **Generation** label (Boomer/X/Millennial/Gen Z/Gen Alpha — date-range table).
- **Next-birthday countdown** + which day of week it falls on.
- **Birthstone / birth flower** (month lookup tables).

### 5.4 Daily history quiz (in MVP)

- **Mechanic:** one puzzle per day, the same for everyone ("Which year did *<event>* happen?"),
  selected by a **date-seeded deterministic pick** from the baked events dataset (everyone on a
  given date gets the same question → shareable/screenshot-able).
- **Storage:** **localStorage** only — streak counter, today-done flag, simple stats. No backend.
- **Scope guard:** multiple-choice (4 years) to keep it client-scoreable and forgiving; an archive
  link to past days adds one indexable URL per day and a return reason.

## 6. Data sources & licensing

- **Primary:** Wikimedia REST **"On this day"** feed — `/feed/onthisday/all/{MM}/{DD}` (and the typed
  sub-feeds: events/births/deaths/holidays). **Free, no API key, no quota.** Proven by MuffinLabs and
  byabbe.se.
- **License:** Wikimedia content is **CC BY-SA**. DateLore **must attribute Wikipedia** (per-section
  + footer credit + link back) and honor share-alike. This is built into the page templates and is a
  **hard requirement**, not optional.
- **Excluded by design (legal risk / cost):** licensed/copyrighted add-ons such as "#1 song the day
  you were born" (Billboard) and any paid data feed. DateLore sticks to free angles only.
- **Static reference tables (our own):** zodiac date ranges, Chinese zodiac, generations, birthstones,
  birth flowers — small hand-authored typed modules, unit-tested.

## 7. Data flow

```
[build time]
Wikimedia feed (366 fetches, once) ──▶ transform/clean/dedupe (pure TS) ──▶ src/data/days/*.json (committed)
                                                                                   │
src/data/reference/*.ts (zodiac, generations, …) ──────────────────────────────┐  │
                                                                                 ▼  ▼
                                                          Astro build ──▶ 366 static day pages + homepage + /birthday + /quiz
[run time, in browser]
user enters birthdate ──▶ pure-TS personal-stat fns ──▶ rendered client-side (no network)
homepage ──▶ JS reads local date ──▶ shows today's pre-built day content + date-seeded daily quiz (localStorage streak)
```

The Wikimedia fetch is a **separate offline script** (run by Claude/owner or a scheduled CI job),
not part of the per-deploy build, so normal deploys are fast and never depend on a live API.

## 8. Error handling & edge cases

- **Feb 29:** real day page exists (leap day) with copy acknowledging its rarity; birthday tool
  handles Feb-29 birthdays (next-birthday logic, "celebrated on Feb 28/Mar 1 in common years").
- **Sparse data days:** some month-days have few notable items; templates render gracefully with
  whatever exists and never show empty sections as broken UI.
- **Build-time fetch failure / rate limiting:** the pipeline is offline and **idempotent**; baked
  JSON is committed, so a failed refresh never breaks a deploy (it just keeps last-good data). The
  fetch script retries/backs off and writes only on success.
- **"Today" timezone:** homepage uses the **visitor's local date**; the daily quiz seed uses a fixed
  reference (UTC) so the "question of the day" is globally consistent — documented and tested.
- **Invalid birthdate input:** validated client-side (range + real-date check) with clear messaging.
- **Quiz with insufficient data for a date:** selection function guarantees a valid puzzle by
  falling back across the dataset; covered by tests.

## 9. Testing strategy (Vitest, mirrors BackyardCalc's tested-core discipline)

Pure functions are unit-tested; data integrity is guarded:

- **Date/personal-stat fns:** age math, day-of-week, next-birthday (incl. Feb 29), generation/zodiac/
  birthstone lookups — table-driven tests with known fixtures.
- **Quiz-selection fn:** determinism (same date → same puzzle), valid-puzzle guarantee, no duplicate
  answer options.
- **Data-transform fn:** Wikimedia payload → clean record shape (dedupe, year parsing, HTML
  stripping), tested against captured fixture payloads (not the live API).
- **Data integrity guard:** a test asserts all 366 day files exist, parse, and have required fields —
  the equivalent of BackyardCalc's `reference-tables.test.ts` (fails the build if data drifts).

## 10. SEO & sharing

- **Programmatic SEO across 366 pages** targeting `born on <month> <day>`, `<month> <day> in history`,
  `what happened on <month> <day>`, `famous people born on <month> <day>`, `<month> <day> zodiac`.
- **JSON-LD:** WebSite/Organization site-wide; per-day structured data (e.g. itemized events) where
  appropriate; FAQ/quiz markup where it fits — reuse BackyardCalc's JSON-LD approach.
- **OG/Twitter tags** + **per-day share images** (a "Born on May 31?" / "Today in history" card) — a
  strong Pinterest/TikTok inflow lever, reusing BackyardCalc's headless-Chrome PNG generation flow.
- **Sitemap** of all 366 days + tool pages; clean internal linking (prev/next day, month index).

## 11. Monetization (honest expectations)

- **Display ads via Ezoic** — accepts new/low-traffic sites (same reasoning as BackyardCalc's
  Ezoic-over-AdSense choice), supplies its own demand. Expect **entertainment-tier RPM (~$4–5)**,
  well below home-improvement, so revenue scales with **pageviews + repeat visits**, which the 366-page
  breadth + daily hook + birthday virality are designed to maximize.
- **Faint affiliate bonus only (not a focus):** birthday-gift ideas, "this day in history" books,
  memento-mori/birth-year posters (Amazon Associates). Secondary to ads.

## 12. Project setup (decisions for the planning phase)

- **New standalone repo** (e.g. `datelore`) under the owner's GitHub, connected to its own Cloudflare
  Pages project; **datelore.com** DNS at Cloudflare. Not in the `project-estimators` repo.
- **Self-refresh:** an optional **free scheduled rebuild** (GitHub Action, e.g. monthly) re-runs the
  Wikimedia fetch + redeploys so data stays current. The *daily* freshness needs no rebuild — it's
  client-side "today" detection over pre-built pages.
- Reuse BackyardCalc's deploy lesson: prefer **`git push` → Cloudflare auto-build** over local
  `wrangler deploy` (no API-token friction).

## 13. MVP scope (YAGNI)

**In MVP:**
- 366 day pages (events / births / deaths / holidays + "famous birthday twins" + zodiac/birthstone).
- Birthday tool with the full §5.3 personal-stat set.
- Homepage spotlighting *today* + birthday-input box.
- **Daily "which year was this?" quiz + localStorage streak** (pulled into MVP per owner decision).
- Per-day OG/share images, JSON-LD, SEO meta, sitemap.
- Ezoic display ads.
- Wikimedia attribution (CC BY-SA) throughout.

**Deferred (post-MVP):**
- "Life in weeks" / memento-mori visual.
- Name-based features (SSA data) and other curiosity tools.
- Multi-language; deeper quiz modes/leaderboards; email/newsletter.

## 14. Risks & open questions

- **RPM is low** (entertainment-tier) — mitigated by breadth + repeat visits + social inflow; revenue
  expectations should be set accordingly (likely slower/smaller than BackyardCalc per visit).
- **CC BY-SA compliance** must be correct (attribution + share-alike) — verify exact requirements at
  implementation; this is a launch blocker if done wrong.
- **Quality/uniqueness:** Wikimedia data is the same everyone can use, so DateLore must win on UX,
  the *personal* birthday framing, the daily quiz, design, and share images — not on raw data.
- **Wikimedia "today" homepage** SEO: confirm the canonical SEO URL is the per-date page (homepage
  links to it) so today's spotlight doesn't create duplicate-content issues.
- **Open:** confirm exact Wikimedia endpoint shapes + rate limits during the data-pipeline build.
  (URL slug format is decided: `/<month-name>-<day>`, e.g. `/may-31` — see §5.1.)

## 15. Milestones (high-level; detailed plan from writing-plans)

1. **Setup:** new repo + Astro scaffold + Cloudflare Pages + domain.
2. **Data pipeline:** Wikimedia fetch/transform script + 366 baked JSON + integrity guard (TDD).
3. **Core fns:** personal-stat + quiz-selection + reference tables (TDD).
4. **Pages:** `[day].astro`, `/birthday`, homepage (today), `/quiz` + streak.
5. **SEO/share:** JSON-LD, OG/share images, sitemap, attribution.
6. **Monetize + launch:** Ezoic, analytics, then off-page (Pinterest/TikTok birthday content).
