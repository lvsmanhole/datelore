# Release Calendar — Data Foundation Implementation Plan (Plan A of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, fully-tested data-foundation library for DateLore's release calendar — the `Release` type, curation config, Amazon affiliate link builder, notability filter, and the loader/indexer that powers every release surface — with zero dependency on live APIs or rendered pages.

**Architecture:** A set of small, focused, side-effect-free TypeScript modules in `src/lib/` plus a shared type module in `src/data/`, mirroring DateLore's existing split (`src/data/types.ts` for shared types, `src/lib/*.ts` for logic, colocated `*.test.ts`). The loader merges a frozen history archive with a nightly-refreshed active window (active wins by `id`) and exposes query helpers indexed by full date and by month-day.

**Tech Stack:** TypeScript, Astro 5, Vitest (`npm test` → `vitest run`). JSON data files imported at build time.

**Plan split (this is Plan A of 3):**
- **Plan A (this doc):** Data-foundation library — types, config, affiliate, notability, loader/indexer. Buildable + testable now.
- **Plan B (later):** Presentation — `/releases/` hub, `/releases/[YYYY-MM]/` month pages, day-page "Released on this day" section, JSON-LD, OG images, affiliate disclosure, nav. Written against Plan A's finished loader API.
- **Plan C (later):** Pipeline + automation — `scripts/fetch-releases.ts` API normalizers, nightly GitHub Action, seed-dataset backfill. Written against live API responses once TMDB / IGDB(Twitch) / Spotify / Amazon keys are provisioned.

---

### Task 1: Types, curation config & Amazon affiliate link builder

**Files:**
- Create: `src/data/releases-types.ts`
- Create: `src/lib/releases-config.ts`
- Create: `src/lib/releases-affiliate.ts`
- Test: `src/lib/releases-affiliate.test.ts`

- [ ] **Step 1: Create the shared types**

`src/data/releases-types.ts`:

```ts
// Shared types for the release-calendar dataset. Kept in src/data (alongside
// types.ts) so the build-time fetch script and the loader can both import them
// without a cycle.
export type Vertical = 'movie' | 'tv' | 'game' | 'music';

export interface MovieMeta { vertical: 'movie'; certification?: string; runtime?: number; genres?: string[]; }
export interface TvMeta { vertical: 'tv'; network?: string; season?: number; status?: string; }
export interface GameMeta { vertical: 'game'; platforms?: string[]; genres?: string[]; }
export interface MusicMeta { vertical: 'music'; artist?: string; recordType?: 'album' | 'ep' | 'single'; }
export type ReleaseMeta = MovieMeta | TvMeta | GameMeta | MusicMeta;

export interface Release {
  id: string;          // `${vertical}:${source}:${sourceId}` — stable identity for dedupe/merge
  vertical: Vertical;
  title: string;
  date: string;        // ISO YYYY-MM-DD, specific calendar date
  popularity: number;  // normalized 0..100 notability score (drives curation + sort)
  image?: string;      // poster/cover URL
  meta: ReleaseMeta;   // vertical-specific fields
  amazonUrl?: string;  // affiliate link; omitted when none can be built
  sourceUrl: string;   // canonical source URL — required for attribution
}

export interface ReleaseDataset {
  archive: Release[];  // frozen history (Plan C backfill)
  active: Release[];   // nightly-refreshed recent-past + future window
}
```

- [ ] **Step 2: Create the curation config**

`src/lib/releases-config.ts`:

```ts
import type { Vertical } from '../data/releases-types';

export interface VerticalConfig {
  minPopularity: number;   // notability threshold, 0..100
  amazonCategory: string;  // appended to the Amazon search query for relevance
}

export interface ReleaseConfig {
  associateTag: string;     // Amazon Associates tracking tag
  amazonDomain: string;     // e.g. 'www.amazon.com'
  archiveYears: number;     // history backfill depth (5 for MVP, 10 in Phase 2)
  activePastDays: number;   // active-window lookback
  activeFutureMonths: number; // active-window lookahead
  verticals: Record<Vertical, VerticalConfig>;
}

// Thresholds are intentionally simple and live in ONE place so signal/noise can be
// dialed after launch without code changes. They need calibration against live API
// popularity distributions during Plan C.
export const RELEASE_CONFIG: ReleaseConfig = {
  associateTag: 'datelore-20',
  amazonDomain: 'www.amazon.com',
  archiveYears: 5,
  activePastDays: 60,
  activeFutureMonths: 18,
  verticals: {
    movie: { minPopularity: 20, amazonCategory: 'movie' },
    tv:    { minPopularity: 20, amazonCategory: 'tv series' },
    game:  { minPopularity: 20, amazonCategory: 'video game' },
    music: { minPopularity: 20, amazonCategory: 'album' },
  },
};
```

- [ ] **Step 3: Write the failing test for the affiliate link builder**

`src/lib/releases-affiliate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAmazonLink } from './releases-affiliate';

describe('buildAmazonLink', () => {
  it('builds a tagged search link when there is no ASIN override', () => {
    const url = buildAmazonLink({ id: 'movie:tmdb:1', title: 'Dune Part Two', vertical: 'movie' });
    expect(url).toBe('https://www.amazon.com/s?k=Dune%20Part%20Two%20movie&tag=datelore-20');
  });

  it('builds a direct /dp/ product link when an ASIN override exists', () => {
    const url = buildAmazonLink(
      { id: 'game:igdb:42', title: 'Whatever', vertical: 'game' },
      undefined,
      { 'game:igdb:42': 'B0TEST1234' },
    );
    expect(url).toBe('https://www.amazon.com/dp/B0TEST1234?tag=datelore-20');
  });

  it('uses the per-vertical category in the search query', () => {
    const url = buildAmazonLink({ id: 'music:mb:7', title: 'Album', vertical: 'music' });
    expect(url).toContain('Album%20album');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/lib/releases-affiliate.test.ts`
Expected: FAIL — cannot find module `./releases-affiliate`.

- [ ] **Step 5: Implement the affiliate link builder**

`src/lib/releases-affiliate.ts`:

```ts
import type { Release } from '../data/releases-types';
import { RELEASE_CONFIG, type ReleaseConfig } from './releases-config';

// Curated exact-product overrides for top titles: release id -> Amazon ASIN.
// Exact /dp/ links convert far better than search links; start empty and add
// hand-picked entries for the biggest releases.
export const ASIN_OVERRIDES: Record<string, string> = {};

export function buildAmazonLink(
  release: Pick<Release, 'id' | 'title' | 'vertical'>,
  config: ReleaseConfig = RELEASE_CONFIG,
  overrides: Record<string, string> = ASIN_OVERRIDES,
): string {
  const asin = overrides[release.id];
  if (asin) {
    return `https://${config.amazonDomain}/dp/${asin}?tag=${config.associateTag}`;
  }
  const category = config.verticals[release.vertical].amazonCategory;
  const query = encodeURIComponent(`${release.title} ${category}`);
  return `https://${config.amazonDomain}/s?k=${query}&tag=${config.associateTag}`;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/lib/releases-affiliate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/data/releases-types.ts src/lib/releases-config.ts src/lib/releases-affiliate.ts src/lib/releases-affiliate.test.ts
git commit -m "feat(releases): release types, curation config, Amazon affiliate link builder"
```

---

### Task 2: Notability filter

**Files:**
- Create: `src/lib/releases-notable.ts`
- Test: `src/lib/releases-notable.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/releases-notable.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isNotable, filterNotable } from './releases-notable';
import type { Release } from '../data/releases-types';

const make = (over: Partial<Release>): Release => ({
  id: 'movie:tmdb:1', vertical: 'movie', title: 'X', date: '2026-06-10',
  popularity: 50, meta: { vertical: 'movie' }, sourceUrl: 'https://example.test', ...over,
});

describe('isNotable', () => {
  it('passes releases at or above the per-vertical threshold', () => {
    expect(isNotable(make({ popularity: 20 }))).toBe(true);
  });
  it('rejects releases below the threshold', () => {
    expect(isNotable(make({ popularity: 19 }))).toBe(false);
  });
});

describe('filterNotable', () => {
  it('keeps only notable releases', () => {
    const list = [make({ id: 'a', popularity: 80 }), make({ id: 'b', popularity: 5 })];
    expect(filterNotable(list).map((r) => r.id)).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/releases-notable.test.ts`
Expected: FAIL — cannot find module `./releases-notable`.

- [ ] **Step 3: Implement the notability filter**

`src/lib/releases-notable.ts`:

```ts
import type { Release } from '../data/releases-types';
import { RELEASE_CONFIG, type ReleaseConfig } from './releases-config';

export function isNotable(release: Release, config: ReleaseConfig = RELEASE_CONFIG): boolean {
  return release.popularity >= config.verticals[release.vertical].minPopularity;
}

export function filterNotable(releases: Release[], config: ReleaseConfig = RELEASE_CONFIG): Release[] {
  return releases.filter((r) => isNotable(r, config));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/releases-notable.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/releases-notable.ts src/lib/releases-notable.test.ts
git commit -m "feat(releases): per-vertical notability filter"
```

---

### Task 3: Loader & indexer (merge, sort, date/month-day queries)

**Files:**
- Create: `src/data/releases-archive.json` (seed: `[]`)
- Create: `src/data/releases-active.json` (seed: `[]`)
- Create: `src/lib/releases.ts`
- Test: `src/lib/releases.test.ts`

- [ ] **Step 1: Create the seed data files**

`src/data/releases-archive.json`:

```json
[]
```

`src/data/releases-active.json`:

```json
[]
```

(These are committed placeholders so the loader's JSON imports resolve. Plan C's pipeline regenerates them with real data.)

- [ ] **Step 2: Write the failing test**

`src/lib/releases.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  mergeReleases, sortReleases, releasesOn, releasesInMonth, releasesForDayPage, upcoming, loadReleases,
} from './releases';
import type { Release } from '../data/releases-types';

const r = (over: Partial<Release>): Release => ({
  id: 'movie:tmdb:1', vertical: 'movie', title: 'X', date: '2026-06-10',
  popularity: 50, meta: { vertical: 'movie' }, sourceUrl: 'https://example.test', ...over,
});

describe('mergeReleases', () => {
  it('lets active override archive entries with the same id', () => {
    const merged = mergeReleases({
      archive: [r({ id: 'a', title: 'Old' })],
      active: [r({ id: 'a', title: 'New' })],
    });
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('New');
  });
});

describe('sortReleases', () => {
  it('sorts by popularity desc then title asc', () => {
    const out = sortReleases([
      r({ id: '1', title: 'B', popularity: 10 }),
      r({ id: '2', title: 'A', popularity: 90 }),
      r({ id: '3', title: 'A', popularity: 10 }),
    ]);
    expect(out.map((x) => x.id)).toEqual(['2', '3', '1']);
  });
});

describe('releasesOn', () => {
  it('returns releases for an exact date, sorted', () => {
    const list = [
      r({ id: '1', date: '2026-06-10', popularity: 10 }),
      r({ id: '2', date: '2026-06-10', popularity: 90 }),
      r({ id: '3', date: '2026-06-11' }),
    ];
    expect(releasesOn(list, '2026-06-10').map((x) => x.id)).toEqual(['2', '1']);
  });
});

describe('releasesInMonth', () => {
  it('returns releases whose date falls in the given YYYY-MM', () => {
    const list = [
      r({ id: '1', date: '2026-06-01' }),
      r({ id: '2', date: '2026-06-30' }),
      r({ id: '3', date: '2026-07-01' }),
    ];
    expect(releasesInMonth(list, '2026-06').map((x) => x.id).sort()).toEqual(['1', '2']);
  });
});

describe('releasesForDayPage', () => {
  it('groups the same month-day across years, newest year first', () => {
    const list = [
      r({ id: '1', date: '2018-06-10' }),
      r({ id: '2', date: '2022-06-10' }),
      r({ id: '3', date: '2022-06-11' }),
    ];
    const groups = releasesForDayPage(list, 6, 10);
    expect(groups.map((g) => g.year)).toEqual([2022, 2018]);
    expect(groups[0].releases.map((x) => x.id)).toEqual(['2']);
  });
});

describe('upcoming', () => {
  it('returns soonest-first releases on or after today, limited', () => {
    const list = [
      r({ id: '1', date: '2026-06-09' }),
      r({ id: '2', date: '2026-06-11' }),
      r({ id: '3', date: '2026-06-15' }),
    ];
    expect(upcoming(list, '2026-06-10', 2).map((x) => x.id)).toEqual(['2', '3']);
  });
});

describe('loadReleases', () => {
  it('returns an array from the seed data files', () => {
    expect(Array.isArray(loadReleases())).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/releases.test.ts`
Expected: FAIL — cannot find module `./releases`.

- [ ] **Step 4: Implement the loader & indexer**

`src/lib/releases.ts`:

```ts
import type { Release, ReleaseDataset } from '../data/releases-types';
import archive from '../data/releases-archive.json';
import active from '../data/releases-active.json';

// Merge active over archive by id (active wins — it's the fresher window).
export function mergeReleases(dataset: ReleaseDataset): Release[] {
  const byId = new Map<string, Release>();
  for (const rel of dataset.archive) byId.set(rel.id, rel);
  for (const rel of dataset.active) byId.set(rel.id, rel);
  return [...byId.values()];
}

// Deterministic order for stable static builds: popularity desc, then title asc.
export function sortReleases(releases: Release[]): Release[] {
  return [...releases].sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title));
}

// Releases on a specific calendar date (YYYY-MM-DD), sorted.
export function releasesOn(releases: Release[], date: string): Release[] {
  return sortReleases(releases.filter((rel) => rel.date === date));
}

// Releases within a calendar month ('YYYY-MM'), sorted.
export function releasesInMonth(releases: Release[], ym: string): Release[] {
  return sortReleases(releases.filter((rel) => rel.date.startsWith(ym + '-')));
}

export interface YearGroup { year: number; releases: Release[]; }

// Day-page anniversaries: releases whose month-day matches mm/dd across all years,
// grouped by year (newest first). mm and dd are 1-based numbers.
export function releasesForDayPage(releases: Release[], mm: number, dd: number): YearGroup[] {
  const md = `-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const byYear = new Map<number, Release[]>();
  for (const rel of releases) {
    if (rel.date.slice(4) !== md) continue;
    const year = Number(rel.date.slice(0, 4));
    const list = byYear.get(year);
    if (list) list.push(rel);
    else byYear.set(year, [rel]);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, rs]) => ({ year, releases: sortReleases(rs) }));
}

// Next `limit` releases on or after `today` (YYYY-MM-DD), soonest first.
export function upcoming(releases: Release[], today: string, limit: number): Release[] {
  return releases
    .filter((rel) => rel.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || b.popularity - a.popularity)
    .slice(0, limit);
}

// Build-time loader: merge the committed archive + active datasets into one list.
export function loadReleases(): Release[] {
  return mergeReleases({ archive: archive as Release[], active: active as Release[] });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/releases.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `npm test`
Expected: PASS — all existing suites plus the three new release suites.

- [ ] **Step 7: Commit**

```bash
git add src/data/releases-archive.json src/data/releases-active.json src/lib/releases.ts src/lib/releases.test.ts
git commit -m "feat(releases): dataset loader and date/month-day indexer"
```

---

## Self-Review

**1. Spec coverage (this plan's scope = the data-foundation slice of the spec):**
- Spec §"Data model" → Task 1 (`releases-types.ts`). ✓
- Spec §"Pipeline / curation thresholds in RELEASE_CONFIG" → Task 1 (`releases-config.ts`) + Task 2 (notability filter). ✓
- Spec §"Monetization / affiliate link builder + ASIN overrides + omit-on-failure" → Task 1 (`releases-affiliate.ts`). ✓
- Spec §"Data loading & indexing" (`releasesOn`, `releasesInMonth`, `releasesForDayPage`, `upcoming`, active-over-archive merge) → Task 3. ✓
- Spec §"Testing" (normalizer/filter/indexing/affiliate/dedupe transforms) → covered except API normalizers, which depend on live API shapes and are deferred to **Plan C**. ✓
- **Deferred by design (not gaps):** pages/SEO/OG/nav/disclosure → **Plan B**; `fetch-releases.ts` normalizers + GitHub Action + seed backfill → **Plan C**.

**2. Placeholder scan:** No "TBD/TODO/handle edge cases" placeholders; every code step contains complete code. The empty `[]` JSON files are intentional committed seeds (documented), not placeholders. ✓

**3. Type consistency:** `Release`, `ReleaseDataset`, `Vertical`, `ReleaseConfig`, `ReleaseConfig.verticals[v].minPopularity`, and `amazonCategory` are referenced identically across Tasks 1–3. `buildAmazonLink`, `isNotable`, `filterNotable`, `mergeReleases`, `sortReleases`, `releasesOn`, `releasesInMonth`, `releasesForDayPage`, `upcoming`, `loadReleases` signatures match their test call sites. ✓

## Next plans (outline — to be written as their own docs)

**Plan B — Presentation:** `/releases/` hub (today + week/month highlights via `upcoming`/`releasesInMonth`), `/releases/[YYYY-MM]/` month pages (`getStaticPaths` over the window), "Released on this day" section in `DayContent.astro` (via `releasesForDayPage`), JSON-LD `ItemList` in `jsonld.ts`, OG images via the satori pipeline, FTC affiliate disclosure, TMDB attribution, and a nav link in `Header.astro`. Written against this plan's finished loader API.

**Plan C — Pipeline & automation:** `scripts/fetch-releases.ts` with per-source normalizers (TMDB, IGDB, MusicBrainz+Spotify) → `Release[]`, pluggable popularity provider, last-good resilience; calibrate `RELEASE_CONFIG` thresholds against live popularity distributions; nightly GitHub Action (cron) that runs the fetch, commits the regenerated `releases-active.json`, and pushes to trigger the Cloudflare build; one-time 5-year backfill into `releases-archive.json`. Requires user-provisioned secrets: TMDB key, Twitch app (IGDB), Spotify app, Amazon Associates tag.
```
