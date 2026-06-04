# DateLore Release Calendar — Design Spec

**Date:** 2026-06-04
**Status:** Approved (design); pending implementation plan
**Author:** brainstorming session

## Summary

Add a release-date aggregation feature to DateLore that tells visitors what notable
things release on a given day — across **movies, TV, video games, and music** (sneakers
excluded; see Decisions). It covers **past, present, and future**: a forward-looking
calendar hub for "what's coming out," and a "released on this day" history section woven
into DateLore's existing day pages. Data refreshes automatically via a **nightly GitHub
Action** that rebuilds the static site. Notable items link to Amazon via affiliate links
(pre-order / buy).

## Decisions (locked during brainstorming)

1. **Verticals:** Movies, TV, Games, Music. **Sneakers excluded** — no reliable free API
   (SoleRetriever/StockX are gated or competitors; third-party scrapers are paid, ToS-risky,
   unreliable) and a poor Amazon-affiliate fit (hyped drops live on SNKRS/StockX/GOAT, not
   Amazon).
2. **Primary model:** Hybrid — a dedicated `/releases/` calendar hub (present/future) **plus**
   a "released on this day" section injected into the existing 366 day pages (history).
3. **Curation:** Notable only — per-vertical popularity/hype threshold, not the full firehose.
4. **Refresh architecture:** Approach A — scheduled nightly rebuild (GitHub Action cron →
   commit baked JSON → Cloudflare auto-build). Stays 100% static, free, fully crawlable HTML
   (critical for DateLore's SEO/AEO-driven traffic model). Live "today" widget deferred to Phase 2.
5. **Music popularity:** Include Spotify in the MVP as a pluggable popularity provider
   (MusicBrainz has no popularity signal). Degrade gracefully (coarser curation) if the
   Spotify credential is absent.
6. **Backfill depth:** 5 years of history for the MVP; full 10 years in Phase 2.

## Context: why this is viable (research summary)

- **Data sources** (per-vertical verdict):
  - Movies + TV → **TMDB API** (free, dedicated release-dates endpoint, ~40 req/s, attribution required). Excellent.
  - Games → **IGDB API** (Twitch-backed, free, reliable). Use IGDB, not RAWG (RAWG is effectively abandonware). Strong.
  - Music → **MusicBrainz** (CC0, has release dates) + **Spotify** (popularity/new-releases). Good with Spotify augmentation.
- **Auto-update** on a static site is solved by a scheduled rebuild — no backend needed.
- **Traffic expectation:** durable evergreen + recurring utility traffic and AEO answers
  ("what game comes out June 10, 2026"), **not** viral. Head terms are dominated by
  high-authority incumbents (releases.com, Metacritic, IGN, GamesRadar); DateLore's edge is
  the **per-date long-tail** that reuses its existing permalink/almanac architecture.
- **Affiliate:** games/physical-media/vinyl pre-orders convert; Amazon commission ~4–5% on
  physical media/music. Sneakers excluded partly because Amazon barely carries hyped drops.

## Architecture overview

```
GitHub Action (nightly cron)
  └─ scripts/fetch-releases.ts
       ├─ TMDB (movies, TV)
       ├─ IGDB (games)            ── normalize ──> merge into baked dataset
       ├─ MusicBrainz + Spotify (music)
       └─ apply notability filter, build affiliate links
  └─ commit src/data/releases.*.json  ──push──> Cloudflare static build

Astro build consumes the dataset via src/lib/releases.ts and renders:
  • /releases/            (hub: today / week / month highlights)
  • /releases/[YYYY-MM]/  (monthly pages, forward window + recent past)
  • existing day pages    ("Released on this day" section, by month-day)
```

No servers or runtime data fetching. Everything renders to static HTML at build time.

## Data model

One normalized shape across all verticals (new file `src/data/releases-types.ts`,
mirroring the `src/data/types.ts` convention so the build-time fetch script and the loader
can both import it without a cycle):

```ts
export type Vertical = 'movie' | 'tv' | 'game' | 'music';

export interface Release {
  id: string;          // `${vertical}:${sourceId}` — stable identity, used for dedupe/merge
  vertical: Vertical;
  title: string;
  date: string;        // ISO YYYY-MM-DD, specific calendar date
  popularity: number;  // normalized 0..100 notability score (drives curation + sort)
  image?: string;      // poster/cover URL
  meta: ReleaseMeta;   // vertical-specific (see below)
  amazonUrl?: string;  // affiliate link (omitted if none could be built)
  sourceUrl: string;   // canonical source URL — required for attribution
}

// Discriminated union keyed by vertical; only the relevant fields are populated.
export type ReleaseMeta =
  | { vertical: 'movie'; certification?: string; runtime?: number; genres?: string[] }
  | { vertical: 'tv'; network?: string; season?: number; status?: string }
  | { vertical: 'game'; platforms?: string[]; genres?: string[] }
  | { vertical: 'music'; artist?: string; recordType?: 'album' | 'ep' | 'single' };
```

## Data pipeline — `scripts/fetch-releases.ts`

Run by the GitHub Action (via `tsx`, already a devDependency). Pure-transform helpers live
in `src/lib/` so they're unit-testable; only network I/O lives in the script.

- **Window strategy:**
  - *Deep archive* — history (5 yrs for MVP). Fetched in a one-time/occasional backfill,
    committed as `src/data/releases-archive.json`, and treated as frozen (history rarely
    changes).
  - *Active window* — nightly fetch of recent past (~60 days) through ~18 months forward,
    written to `src/data/releases-active.json`.
  - The loader merges active over archive by `id` (active wins).
- **Per-vertical fetch + notability:**
  - Movies/TV (TMDB): filter by `popularity` and a `vote_count` floor; prefer wide releases /
    network premieres.
  - Games (IGDB): rank by `hypes` / `rating` / `follows`; respect IGDB rate limits (≈4 req/s)
    with batching + backoff.
  - Music (MusicBrainz + Spotify): pull release-groups (albums/EPs) from MusicBrainz; attach a
    popularity score from Spotify. The popularity source is a **pluggable provider** — if the
    Spotify credential is missing, fall back to a coarse heuristic (e.g., known-artist list /
    release-group type) and log that music curation is degraded.
  - Threshold values live in a single `RELEASE_CONFIG` (per-vertical) so signal/noise is
    tunable post-launch without code changes.
- **Affiliate link builder:** Amazon Associates tag from config. Default to an
  affiliate-tagged Amazon **search deep-link** (`/s?k=<title+vertical>&tag=<assoc-tag>`),
  with an optional curated **ASIN-override map** for the biggest titles (exact product links
  convert far better). Omit `amazonUrl` rather than emit a broken link.
- **Resilience:** if any API call fails, keep the last-good slice for that vertical — never
  overwrite with empty, never publish a blank calendar. Validate/normalize dates; dedupe
  across sources by `id`.

## Pages & URLs

Reuses the existing `build: { format: 'directory' }` clean trailing-slash convention.

- **`/releases/`** — hub. **Today** at the top, then this-week and this-month highlights,
  vertical filter chips, and links to month pages. The site-wide entry point for the feature
  (add to `Header.astro` nav).
- **`/releases/[YYYY-MM]/`** — monthly release pages for the forward window + recent past
  (e.g. `/releases/2026-06/`). Generated via `getStaticPaths` enumerating months in range.
  This is the programmatic-SEO long-tail engine ("video game releases June 2026").
- **Existing day pages** (`/may-31/` etc.) — new **"Released on this day"** section in
  `DayContent.astro`, showing notable releases for that month-day across the backfilled
  history, grouped by year. Adds **zero** new pages; enriches DateLore's highest-SEO pages.
  Data comes from a month-day index built by `src/lib/releases.ts`.

## Data loading & indexing — `src/lib/releases.ts`

- Load + merge `releases-archive.json` + `releases-active.json`.
- Build two indexes:
  - **By full date** (`YYYY-MM-DD`) → calendar hub + month pages.
  - **By month-day** (`MM-DD`) → day-page anniversaries.
- Provide helpers: `releasesOn(date)`, `releasesInMonth(ym)`, `releasesForDayPage(mm, dd)`,
  `upcoming(limit)`, sorted by `popularity` then date.

## Monetization

- Amazon Associates tag in config; **"Pre-order"** CTA for future-dated items, **"Buy"** for
  released items.
- FTC affiliate disclosure near link clusters. (Amazon is already disclosed in
  `privacy.astro`; add a release-specific disclosure line where links appear.)

## SEO / AEO

- JSON-LD via the existing `src/lib/jsonld.ts` patterns:
  - Month pages + day-page section → `ItemList` of releases.
  - Per-release entries modeled as schema.org `Event`-style / `CreativeWork` items where
    appropriate.
- OG images for `/releases/` and month pages via the existing satori pipeline
  (`src/pages/og/[slug].png.ts` / `src/lib/og-card.ts`).
- **Attribution:** TMDB attribution is required by their ToS — include source credit in the
  releases section/footer. Credit IGDB / MusicBrainz / Spotify as appropriate.
- Add new pages to the sitemap (automatic via `@astrojs/sitemap`) and consider a mention in
  `public/llms.txt`.

## Error handling

- Pipeline: per-vertical last-good fallback; build never fails or publishes empty due to one
  flaky API.
- Loader: tolerate missing images (placeholder), missing `amazonUrl` (no link), malformed
  entries (skip with a warning).
- Rate limits: batching + exponential backoff (esp. IGDB).

## Testing (vitest, matching existing `*.test.ts` pattern)

Unit tests for the pure transforms, against mocked API fixtures:
- API→`Release` normalizers (one per source).
- Notability filter (threshold behavior per vertical).
- Date indexing (by full-date and by month-day).
- Affiliate-link builder (search deep-link + ASIN override + omit-on-failure).
- Cross-source dedupe/merge (active-over-archive by `id`).

Network fetch itself is not unit-tested (integration concern).

## Prerequisites (user must provision)

Stored as **GitHub Action secrets** (not committed):
- **TMDB** API key (free signup).
- **IGDB** via **Twitch** developer app (client ID + secret).
- **Spotify** developer app (client ID + secret) — for music popularity.
- **Amazon Associates** tag (already an Associates member; reuse existing tag).

MusicBrainz needs no key (rate-limited; set a descriptive User-Agent).

## Phasing

**Phase 1 (MVP):**
- `releases-types.ts`, `releases.ts` loader/indexer.
- `fetch-releases.ts` pipeline + `RELEASE_CONFIG`.
- One-time 5-year backfill → `releases-archive.json`.
- `/releases/` hub + `/releases/[YYYY-MM]/` month pages.
- "Released on this day" section in `DayContent.astro`.
- JSON-LD, OG images, affiliate links + disclosure, attribution.
- Nightly GitHub Action.
- Unit tests for transforms.
- Nav link in `Header.astro`.

**Phase 2:**
- Extend archive to full 10 years.
- Per-vertical hubs (`/releases/games/`, etc.).
- Live "today" widget (Approach C).
- Richer music curation / charts.
- "This week" email or RSS.

## Risks & open flags

1. **Music notability** is the weakest signal; depends on Spotify. Without it, curation is coarse.
2. **Amazon ASIN resolution** at scale is imperfect; search deep-links convert worse than
   exact product links. Curated ASIN overrides mitigate for top titles.
3. **Head-term SEO competition** is strong; rely on per-date long-tail + AEO, not head terms.
4. **API compliance:** honor TMDB attribution + each API's ToS; keep keys in GitHub secrets.
5. **Build scale:** keep forward month pages bounded and route history through existing day
   pages to avoid a page-count explosion.
