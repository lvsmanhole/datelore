# DateLore — Keyword-Informed Daily Pinterest Pins — Design Spec

**Date:** 2026-06-13
**Status:** Approved (design); pending implementation plan
**Author:** brainstorming session

## Summary

Extend DateLore's existing Pinterest pin engine into a **keyword-informed, folder-authored
daily-pin system**. Today the engine generates exactly two pins per day (`Born on [Month]
[Day]?` and `[Month] [Day] in History`) dynamically from `src/data/dates.ts`. This adds:

1. **Pinterest keyword research** (Phase 0) that grounds board names, pin-title templates,
   descriptions, and hashtags in what actually ranks in **Pinterest search** for this niche.
2. A **`src/data/pins/<MM>/<DD>/` folder structure** — one JSON file per pin "post" — as the
   continuous authoring surface for *additional* pins beyond the two auto-generated ones.
3. A seeded **"Released on this day"** pin per qualifying day, built from the existing release
   calendar (`src/lib/releases.ts`) — **evergreen anniversaries** of movies/TV/games/music.
4. A **continuous daily-posting** path: any file dropped into a day folder renders to a branded
   image, enters `/pins.json`, and is picked up by the existing nightly drip poster.

The model is **additive and low-risk**: the working born/history generator is untouched; the
folder is purely a growth surface. Everything stays 100% static and build-time, consistent with
the current architecture.

## Decisions (locked during brainstorming)

1. **Folder model: Hybrid (Approach A).** Born/History keep auto-generating with zero
   maintenance. The `src/data/pins/<MM>/<DD>/` folder holds the new release pins plus any extra
   pins added later. The manifest = born + history + folder pins. (Rejected Approach B "Unified"
   — seeding all 732+ pins into files — as needless rework that risks the working baseline.)
2. **"What releases that day" = evergreen anniversaries** ("released on this day in past
   years"), not a forward/upcoming calendar. Every qualifying day gets an evergreen pin with a
   multi-year half-life; pins never go stale. (Forward "coming soon" pins are explicitly out of
   scope — they age out and most days don't qualify.)
3. **Keyword focus: Pinterest search**, not Google SEO. Pinterest is its own search engine and
   is the channel meant to drive this traffic. Research targets pin titles, descriptions, board
   names, and hashtags — niche/category research, since the site has ~0 first-party data.
4. **Pin authoring: data file → rendered image.** Each pin is a small validated JSON file the
   build renders into a branded 1000×1500 PNG and adds to `/pins.json`. Keeps everything
   on-brand and auto-postable.
5. **Keyword research runs as Phase 0 inside the build** (not as a separate pre-spec task). The
   spec parameterizes the keyword-driven values; Phase 0 fills them in as the first step.

## Context: what already exists (do not rebuild)

- **Pin engine** — `src/lib/pin-card.ts` (pure `bornPin`/`historyPin` returning `PinText`, with
  a broad `SENSITIVE` regex that skips tragedy/conflict leads); `src/pages/pin/[slug].png.ts`
  (Satori → 1000×1500 PNG via shared `og-brand.ts` primitives and a `pinTree(pin: PinText)`
  renderer); `src/pages/pins.json.ts` + `src/lib/pins-manifest.ts` (`buildPinManifest()` →
  posting manifest). Two boards today: "Born On This Day", "On This Day in History".
- **Auto-poster** — `scripts/post-to-pinterest.ts` fetches the deployed `/pins.json`, drips
  ~8 pins/run via Pinterest API v5, dedupes through a committed ledger; `.github/workflows/
  pinterest.yml` runs it on a daily cron. **Currently blocked on Pinterest *Standard access*
  approval** (Trial apps can't create production pins — code 29); it no-ops gracefully and
  resumes automatically once approved. Manual posting from `/pins.json` works meanwhile.
- **Release calendar** — `src/lib/releases.ts` with `releasesForDayPage(releases, mm, dd)`
  returning anniversaries grouped by year, backed by `releases-archive.json` (1,747 entries,
  ~5 years) + `releases-active.json`, refreshed nightly by `scripts/fetch-releases.ts`. Each
  `Release` has `title`, `date` (ISO), `popularity` (0–100), `vertical`, optional `amazonUrl`.
- **Helpers** — `src/lib/slug.ts` (`slugFromParts`, `monthName`, `toSlug`); `src/lib/utm.ts`
  (`withUtm`, `pinDestination(daySlug, kind)`); `src/lib/og-brand.ts` (brand primitives,
  `renderPng`).

**Coverage reality:** 1,747 releases over ~5 years ≈ 1/day on average but **clustered** (music/
film Fridays, game launch dates). Many days will have 0–1 *notable* anniversaries, so the
release pin is **opportunistic**: it skips days with nothing above the popularity threshold
rather than emit weak filler.

## Architecture overview

```
[Phase 0]  Pinterest keyword research ──► docs/pinterest-keyword-strategy.md
              (board names, title templates, description formula, hashtag sets, priority dates)
                                   │  informs templates ▼
[build time]
  src/data/pins/<MM>/<DD>/<id>.json   (authored/seeded pin specs — the growth surface)
        │
        ▼
  src/lib/pin-content.ts   (import.meta.glob load + schema validate → PinText + manifest fields)
        │                                         │
        ▼                                         ▼
  src/pages/pin/[slug].png.ts                src/lib/pins-manifest.ts
  (+ folder pins at /pin/<day>-<id>.png)     buildPinManifest() = born + history + folder pins
        │                                         │
        ▼                                         ▼
  /pin/june-13-release.png                   /pins.json  (image + UTM'd link + title + desc + board)
                                                  │
                                   existing nightly drip poster ──► Pinterest (once Standard access)

  scripts/seed-release-pins.ts  ──writes──►  src/data/pins/<MM>/<DD>/release.json  (idempotent)
        ▲
        └─ src/lib/releases.ts  releasesForDayPage(mm, dd)  +  popularity threshold  +  SENSITIVE filter
```

No servers, no runtime fetching. The auto-poster keeps reading the **deployed** `/pins.json`
(it runs under plain `tsx` and can't use Vite's `import.meta.glob`), so the folder loader lives
only in the Astro build path — unchanged contract for the poster.

## Data model — `PinSpec`

New file `src/lib/pin-spec.ts` (type + validator), mirroring the `types.ts`/`releases-types.ts`
convention so the loader and seeder share it without a cycle.

```ts
export type PinSpecKind = 'release' | 'birthday' | 'zodiac' | 'observance' | 'custom';

export interface PinSpec {
  id: string;            // unique within the day folder; drives filename + image slug suffix
  kind: PinSpecKind;     // categorization + UTM campaign + art accent
  board: string;         // must be in ALLOWED_BOARDS
  kicker: string;        // small uppercase eyebrow
  title: string;         // big serif headline
  lines: string[];       // 1–3 supporting lines (non-empty)
  hashtags?: string[];   // appended to the manifest description
  description?: string;  // optional override; default is composed from lines + day context
  link?: string;         // site-relative path override; default `/<month>-<day>/`
  attribution?: string;  // source credit baked into the card (e.g. release-data source)
  enabled?: boolean;     // default true; false = skip entirely (no render, not in manifest)
  generated?: boolean;   // true = written by a seeder; guards re-seed clobber (see seeder)
}
```

A `PinSpec` maps to the existing `PinText` for rendering (`kicker`/`title`/`lines`/`foot`/
`attribution`) and supplies the extra manifest fields (`board`/`link`/`description`/`hashtags`).

`ALLOWED_BOARDS` is a single exported constant — the two existing boards plus the new
**"Released On This Day"** board (final name from Phase 0). Guard tests assert every pin's board
is in this set; the seeder and any hand-authored pin must use it.

## Folder structure

```
src/data/pins/
  01/
    01/ release.json
  06/
    13/ release.json
        birthday-spotlight.json   # example hand-added extra pin
  ...
```

- Path is the source of truth for the date: `<MM>/<DD>` (zero-padded), parsed by the loader.
- Filename stem need not equal `id`, but the seeder uses `<id>.json` for clarity.
- Only **qualifying** days get a seeded `release.json`; sparse days simply have no file.
- Adding a new pin = dropping a new `*.json` into a day folder. That is the "continuous way to
  post more stuff daily."

## Loader — `src/lib/pin-content.ts`

- Load every `src/data/pins/**/*.json` via `import.meta.glob('...', { eager: true })` (same
  Vite mechanism `dates.ts` uses; this is why the loader is build-only).
- For each file: derive `(mm, dd)` from the path; **validate** against `PinSpec` (reject on
  missing/invalid fields — fail the build loudly, never silently drop a malformed pin); skip if
  `enabled === false`.
- Emit, per pin: a `PinText` (for the renderer) and a `PinManifestEntry`-shaped record (for the
  manifest), keyed by a stable image slug `<daySlug>-<id>` (e.g. `june-13-release`).
- Deterministic ordering (calendar date, then `id`) for stable static builds.
- Helpers: `loadPinSpecs()`, `pinSpecToText(spec)`, `pinSpecToManifest(spec, daySlug)`.

## Release-pin generation + seeder

**Pure generator** — `releasePin(mm, dd, releases): PinSpec | null` in `src/lib/pin-card.ts`
(sibling to `bornPin`/`historyPin`):
- Call `releasesForDayPage(releases, mm, dd)`, flatten, keep items with `popularity >=
  RELEASE_PIN_MIN_POP` (a single tunable constant), take the top N (default 2–3).
- Run each candidate `title` through the existing `SENSITIVE` regex (cheap insurance, even
  though media titles are rarely flagged); drop flagged items.
- Return `null` if nothing qualifies (caller skips the day — no weak filler).
- Otherwise compose `lines` like `"2015 · Jurassic World"` (year · title), set
  `board: 'Released On This Day'`, `attribution` per the release-data source's terms, and
  `kicker`/`title` from the Phase-0 template (e.g. `title: "Released on June 13"`).

**Seeder script** — `scripts/seed-release-pins.ts` (run via `tsx`, like `fetch-releases.ts`):
- Iterate all 366 month-days; call `releasePin`; for non-null results write
  `src/data/pins/<MM>/<DD>/release.json` with `generated: true`.
- **Idempotent + non-clobbering, three modes:** default run is **add-only** — write missing
  files, skip every file that already exists (safe to re-run anytime). `--force` **refreshes
  seeded files** — overwrites files marked `generated: true`, still protecting hand-curated
  files (those without the flag). `--force-all` overwrites everything including curated files
  (escape hatch). Seeded files are always written with `generated: true`.
- History rarely changes, so seeded release pins are stable even though the nightly release
  refresh keeps updating the **forward** window (which this feature ignores).

## Rendering — `src/pages/pin/[slug].png.ts`

- `getStaticPaths` keeps the born/history paths and **appends** one path per folder pin:
  `params.slug = '<daySlug>-<id>'`, props carry the loaded `PinSpec`.
- The `GET` handler converts a folder pin's `PinSpec` to `PinText` and calls the existing
  `pinTree(pin)` + `renderPng` — **no new rendering code**, just a new source of `PinText`.
- Optional `kind`-driven art accent (e.g. a gold "Released On This Day" eyebrow treatment) is a
  small, additive tweak inside `pinTree`; stays within Satori's font limits (the existing
  no-glyph/tofu rule — spell out names, never astrological/emoji glyphs).

## Manifest, UTM, boards & descriptions

- `buildPinManifest()` (in `pins-manifest.ts`) appends folder-pin entries after the born/history
  entries: `image: ${SITE_ORIGIN}/pin/<daySlug>-<id>.png`, `link` = UTM'd destination,
  `title`/`description`/`board` from the spec.
- **Generalize `pinDestination`** in `utm.ts` to accept an arbitrary campaign string (today it's
  hardcoded to `'born'|'history'`). Folder pins use `utm_campaign` per kind (e.g.
  `released-on-this-day`) so GA4 can attribute each pin type separately.
- **Descriptions** follow the Phase-0 formula: keyword-rich lead + day context + hashtags
  (Pinterest descriptions are search-indexed). `hashtags` from the spec are appended.
- **Boards:** add **"Released On This Day"** (final name from Phase 0) to `ALLOWED_BOARDS`. The
  owner creates it on Pinterest (the auto-poster already auto-creates boards by name).

## Phase 0 — Pinterest keyword research (first implementation step)

Deliverable: `docs/pinterest-keyword-strategy.md`. Method (Pinterest-native, since Google data
is ~0):
- **Pinterest autocomplete + "more ideas"/Trends** via the `/browse` skill — harvest the
  phrases Pinterest itself suggests for seeds like *born on this day*, *[zodiac] personality*,
  *on this day in history*, *[month] facts*, *movies released in [year]*, *nostalgia*, *birthday
  facts*.
- **Competitor pin copy** — how high-engagement accounts in almanac/astrology/nostalgia niches
  title and describe pins (titles, description structure, hashtag patterns, board naming).
- Optional Google-side niche sizing via the SEO keyword skill / Ahrefs MCP for cross-reference
  only (not the primary signal).

Output that feeds later phases:
- Final **board names** (esp. the release board).
- **Title templates** per pin kind (`bornPin`/`historyPin`/`releasePin` headline wording).
- **Description formula** + **hashtag sets** per kind.
- A **priority-date list** (holidays, high-search birthdays, big release anniversaries) for the
  owner to seed/post first.

Per the cost/working-style preference, run this **inline** (browse + targeted lookups), not via
a large subagent fan-out.

## Testing (vitest, matching existing `*.test.ts` pattern)

Pure-transform unit tests + guard assertions (extend the existing pin guard suite):
- `releasePin`: threshold behavior, top-N selection, `SENSITIVE` drop, `null` on sparse day.
- `pin-content` loader: path→date parsing, schema validation (reject malformed), `enabled:false`
  skip, deterministic ordering.
- `PinSpec` validator: required fields, board ∈ `ALLOWED_BOARDS`.
- **Guard tests over the full manifest** (born + history + folder): every pin links to a **real
  day slug**, every image is **same-origin**, every board is **allow-listed**, history/release
  pins carry required attribution, no pin leads with a `SENSITIVE` phrase.
- UTM: generalized `pinDestination` campaign correctness; path keeps its trailing slash.

Network fetch (release data refresh) remains an integration concern, not unit-tested.

## Error handling

- Loader: a malformed/invalid pin file **fails the build loudly** (don't silently skip — a
  missing pin should be visible). Missing optional fields degrade gracefully (no hashtags, no
  attribution).
- Seeder: never overwrite hand-curated files; never write an empty/`null` pin; skip-and-log
  sparse days.
- Release dependency: if `releasesForDayPage` returns nothing for a day, that's expected — skip.
- Build scale: only **enabled** pins render. Release pins are a subset of days, but the suite of
  pins still grows the build; monitor `astro build` time (already ~7 min at 732 pins on
  Cloudflare's ~20-min limit) and flag if it climbs materially.

## Phasing

**Phase 0 — Keyword research.** `docs/pinterest-keyword-strategy.md`; lock board names, title
templates, description formula, hashtag sets, priority dates.

**Phase 1 — Folder + schema + loader.** `PinSpec` type + validator (`pin-spec.ts`);
`pin-content.ts` loader; `ALLOWED_BOARDS`; unit tests. No new pins yet (loader returns empty).

**Phase 2 — Release pins.** `releasePin` generator + `RELEASE_PIN_MIN_POP`;
`scripts/seed-release-pins.ts` (idempotent, non-clobbering); seed all qualifying days; tests.

**Phase 3 — Render + manifest + UTM.** Extend `[slug].png.ts` getStaticPaths/GET; generalize
`pinDestination`; append folder pins in `buildPinManifest()`; description/hashtag composition;
optional release art accent; guard tests over the full manifest.

**Phase 4 — Posting workflow + docs.** Owner creates the new board; confirm the drip poster
picks up folder pins from `/pins.json`; document the "add a pin" authoring loop and the
priority-date seeding order in `docs/pinterest-autoposter.md` (or a new `docs/daily-pins.md`).

## Out of scope (deferred, with rationale)

- **Forward/upcoming "coming soon" release pins** — time-sensitive, most days don't qualify,
  pins age out. Evergreen anniversaries only.
- **Unified folder model (Approach B)** — seeding born/history into files; needless rework now.
- **New non-release pin kinds** (zodiac-personality, birthday-spotlight, observance pins) — the
  schema supports them (`kind`), but seeding them is a later opportunity, not this build.
- **Short-form video / non-Pinterest channels** — out of this engine entirely.
- **Self-hosting release cover art in pins** — pins use DateLore's own branded art (no
  third-party images), so this stays unnecessary.

## Risks & open flags

1. **Sparse-day coverage** — many days lack a notable release anniversary; the release pin is
   opportunistic by design. Mitigated by graceful skip; the day still has its born/history pins.
2. **Build time** — more pins lengthen `astro build`; monitor against Cloudflare's limit.
3. **Pinterest Standard access** — auto-posting is still gated; until approved, posting is
   manual from `/pins.json`. The drip code is ready and no-ops gracefully meanwhile.
4. **Keyword research depends on Pinterest-native tooling** (autocomplete/Trends via `/browse`);
   Google keyword volume is a weak cross-reference for a Pinterest-search goal, not the signal.
5. **Re-seed clobber** — guarded by the `generated` flag + `--force`/`--force-all` split so a
   re-seed never silently overwrites curated edits.
