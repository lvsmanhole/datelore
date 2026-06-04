# Release Calendar — Pipeline & Automation Implementation Plan (Plan C of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the release calendar with real, curated data and keep it fresh automatically — pure per-source normalizers (TMDB, IGDB, Spotify) plus a `scripts/fetch-releases.ts` orchestrator, a nightly GitHub Action that regenerates `releases-active.json` and pushes (triggering the Cloudflare build), and a one-time 5-year backfill into `releases-archive.json`.

**Architecture:** Normalizers are pure `(rawApiObject) -> Release | null` functions in `src/lib/releases-normalize.ts` — unit-tested with Vitest against fixtures. The orchestrator script does all network I/O (auth, pagination, rate limits, last-good fallback), calls the normalizers + `filterNotable` (Plan A) + `buildAmazonLink` (Plan A), dedupes, and writes the JSON datasets the Plan A loader reads. The GitHub Action runs the orchestrator on a cron.

**Tech Stack:** Node 20 global `fetch`, `tsx` (already a devDependency), Vitest. Depends on Plan A (`releases-types`, `releases-config`, `releases-notable`, `releases-affiliate`) and Plan B (`groupByVertical` from `releases-view`).

**⚠️ Live-data caveat:** Normalizer field mappings and popularity scaling are written against the APIs' *documented* response shapes. The pure functions and their fixture tests are correct by construction, but the **fixtures encode assumptions** — when real data first flows (Task 5), verify a sample and adjust field paths / thresholds. Music (Spotify) is the weakest vertical for date-range coverage; expect to tune it.

**Prerequisite secrets** (GitHub Action repo secrets; also set as local env vars to run Tasks 5/7):
- `TMDB_API_KEY` — themoviedb.org account → Settings → API
- `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` — dev.twitch.tv/console/apps (powers IGDB)
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` — developer.spotify.com/dashboard

(The Amazon Associates tag is non-secret and already lives in `RELEASE_CONFIG.associateTag`.)

---

### Task 1: Popularity scalers + unix-date helper

**Files:**
- Create: `src/lib/releases-normalize.ts`
- Test: `src/lib/releases-normalize.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/releases-normalize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tmdbPopularity, igdbPopularity, spotifyPopularity, isoFromUnix } from './releases-normalize';

describe('popularity scalers (all clamp to 0..100)', () => {
  it('tmdb clamps its unbounded score', () => {
    expect(tmdbPopularity(12.3)).toBe(12);
    expect(tmdbPopularity(450)).toBe(100);
    expect(tmdbPopularity(-5)).toBe(0);
  });
  it('igdb prefers total_rating, falls back to hype count', () => {
    expect(igdbPopularity({ total_rating: 88 })).toBe(88);
    expect(igdbPopularity({ hypes: 40 })).toBe(100); // 40*3 clamped
    expect(igdbPopularity({ hypes: 10 })).toBe(30);
    expect(igdbPopularity({})).toBe(0);
  });
  it('spotify passes its 0..100 score through', () => {
    expect(spotifyPopularity(73)).toBe(73);
  });
});

describe('isoFromUnix', () => {
  it('converts unix seconds to a UTC YYYY-MM-DD', () => {
    expect(isoFromUnix(0)).toBe('1970-01-01');
    expect(isoFromUnix(1704067200)).toBe('2024-01-01');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/releases-normalize.test.ts`
Expected: FAIL — cannot find module `./releases-normalize`.

- [ ] **Step 3: Implement the helpers**

`src/lib/releases-normalize.ts`:

```ts
import type { Release } from '../data/releases-types';

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// TMDB popularity is unbounded (~0..1000s); clamp at 100. Notable titles sit well
// above the 20 threshold, so clamping the long high tail is harmless.
export function tmdbPopularity(raw: number): number {
  return clamp(raw);
}

// IGDB: prefer the aggregated rating (already 0..100). Unrated upcoming games have
// no rating, so fall back to the hype count (×3 → rough 0..100). Calibrate in Task 7.
export function igdbPopularity(g: { total_rating?: number; hypes?: number }): number {
  if (typeof g.total_rating === 'number') return clamp(g.total_rating);
  if (typeof g.hypes === 'number') return clamp(g.hypes * 3);
  return 0;
}

// Spotify popularity is already 0..100.
export function spotifyPopularity(raw: number): number {
  return clamp(raw);
}

// Unix seconds (IGDB first_release_date) → UTC YYYY-MM-DD.
export function isoFromUnix(sec: number): string {
  return new Date(sec * 1000).toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/releases-normalize.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/releases-normalize.ts src/lib/releases-normalize.test.ts
git commit -m "feat(releases): popularity scalers + unix-date helper"
```

---

### Task 2: TMDB movie + TV normalizers

**Files:**
- Modify: `src/lib/releases-normalize.ts` (append)
- Test: `src/lib/releases-normalize.test.ts` (append)

- [ ] **Step 1: Append the failing test**

Add to `src/lib/releases-normalize.test.ts` (extend the import from `./releases-normalize` to include `normalizeTmdbMovie, normalizeTmdbTv`):

```ts
describe('normalizeTmdbMovie', () => {
  it('maps a discover result to a Release', () => {
    const rel = normalizeTmdbMovie({ id: 693134, title: 'Dune: Part Two', release_date: '2024-03-01', popularity: 320.5, poster_path: '/abc.jpg' });
    expect(rel).toMatchObject({
      id: 'movie:tmdb:693134', vertical: 'movie', title: 'Dune: Part Two',
      date: '2024-03-01', popularity: 100,
      image: 'https://image.tmdb.org/t/p/w342/abc.jpg',
      sourceUrl: 'https://www.themoviedb.org/movie/693134',
    });
  });
  it('drops results with no release date', () => {
    expect(normalizeTmdbMovie({ id: 1, title: 'X', release_date: '', popularity: 50, poster_path: null })).toBeNull();
  });
});

describe('normalizeTmdbTv', () => {
  it('maps a discover result to a Release using name + first_air_date', () => {
    const rel = normalizeTmdbTv({ id: 94997, name: 'House of the Dragon', first_air_date: '2022-08-21', popularity: 88, poster_path: null });
    expect(rel).toMatchObject({ id: 'tv:tmdb:94997', vertical: 'tv', title: 'House of the Dragon', date: '2022-08-21', popularity: 88 });
    expect(rel?.image).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/releases-normalize.test.ts`
Expected: FAIL — `normalizeTmdbMovie` is not exported.

- [ ] **Step 3: Append the implementation**

Add to `src/lib/releases-normalize.ts`:

```ts
const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

export interface TmdbMovie { id: number; title: string; release_date: string; popularity: number; poster_path: string | null; }
export function normalizeTmdbMovie(m: TmdbMovie): Release | null {
  if (!m.release_date) return null;
  return {
    id: `movie:tmdb:${m.id}`,
    vertical: 'movie',
    title: m.title,
    date: m.release_date,
    popularity: tmdbPopularity(m.popularity),
    image: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : undefined,
    meta: { vertical: 'movie' },
    sourceUrl: `https://www.themoviedb.org/movie/${m.id}`,
  };
}

export interface TmdbTv { id: number; name: string; first_air_date: string; popularity: number; poster_path: string | null; }
export function normalizeTmdbTv(t: TmdbTv): Release | null {
  if (!t.first_air_date) return null;
  return {
    id: `tv:tmdb:${t.id}`,
    vertical: 'tv',
    title: t.name,
    date: t.first_air_date,
    popularity: tmdbPopularity(t.popularity),
    image: t.poster_path ? `${TMDB_IMG}${t.poster_path}` : undefined,
    meta: { vertical: 'tv' },
    sourceUrl: `https://www.themoviedb.org/tv/${t.id}`,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/releases-normalize.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/releases-normalize.ts src/lib/releases-normalize.test.ts
git commit -m "feat(releases): TMDB movie + TV normalizers"
```

---

### Task 3: IGDB game normalizer

**Files:**
- Modify: `src/lib/releases-normalize.ts` (append)
- Test: `src/lib/releases-normalize.test.ts` (append)

- [ ] **Step 1: Append the failing test**

Add to `src/lib/releases-normalize.test.ts` (extend the import to include `normalizeIgdbGame`):

```ts
describe('normalizeIgdbGame', () => {
  it('maps an IGDB game (unix date, cover upgrade) to a Release', () => {
    const rel = normalizeIgdbGame({
      id: 1942, name: 'The Witcher 3', first_release_date: 1431993600,
      total_rating: 94, cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/co1wyy.jpg' },
    });
    expect(rel).toMatchObject({
      id: 'game:igdb:1942', vertical: 'game', title: 'The Witcher 3',
      date: '2015-05-19', popularity: 94,
      image: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
      sourceUrl: 'https://www.igdb.com/games/1942',
    });
  });
  it('drops games with no release date', () => {
    expect(normalizeIgdbGame({ id: 1, name: 'TBA', hypes: 5 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/releases-normalize.test.ts`
Expected: FAIL — `normalizeIgdbGame` is not exported.

- [ ] **Step 3: Append the implementation**

Add to `src/lib/releases-normalize.ts`:

```ts
export interface IgdbGame {
  id: number; name: string; first_release_date?: number;
  total_rating?: number; hypes?: number; cover?: { url?: string };
}
export function normalizeIgdbGame(g: IgdbGame): Release | null {
  if (!g.first_release_date) return null;
  const cover = g.cover?.url
    ? `https:${g.cover.url.replace('t_thumb', 't_cover_big')}`.replace('https://images', 'https://images')
    : undefined;
  return {
    id: `game:igdb:${g.id}`,
    vertical: 'game',
    title: g.name,
    date: isoFromUnix(g.first_release_date),
    popularity: igdbPopularity(g),
    image: cover,
    meta: { vertical: 'game' },
    sourceUrl: `https://www.igdb.com/games/${g.id}`,
  };
}
```

> Note: IGDB cover URLs come back protocol-relative (`//images.igdb.com/...`). Prefixing `https:` yields `https://images.igdb.com/...`; the `t_thumb`→`t_cover_big` swap requests the large art. The redundant `.replace` is a no-op guard kept only so the fixture assertion is explicit — drop it if you prefer.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/releases-normalize.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/releases-normalize.ts src/lib/releases-normalize.test.ts
git commit -m "feat(releases): IGDB game normalizer"
```

---

### Task 4: Spotify album normalizer

**Files:**
- Modify: `src/lib/releases-normalize.ts` (append)
- Test: `src/lib/releases-normalize.test.ts` (append)

- [ ] **Step 1: Append the failing test**

Add to `src/lib/releases-normalize.test.ts` (extend the import to include `normalizeSpotifyAlbum`):

```ts
describe('normalizeSpotifyAlbum', () => {
  it('maps a day-precision album to a Release, using the passed popularity', () => {
    const rel = normalizeSpotifyAlbum({
      id: '4abc', name: 'Midnights', release_date: '2022-10-21', release_date_precision: 'day',
      images: [{ url: 'https://i.scdn.co/x.jpg' }], artists: [{ name: 'Taylor Swift' }], album_type: 'album',
    }, 95);
    expect(rel).toMatchObject({
      id: 'music:spotify:4abc', vertical: 'music', title: 'Midnights', date: '2022-10-21', popularity: 95,
      meta: { vertical: 'music', artist: 'Taylor Swift', recordType: 'album' },
      sourceUrl: 'https://open.spotify.com/album/4abc',
    });
  });
  it('drops albums without a day-precision date (a calendar day is required)', () => {
    expect(normalizeSpotifyAlbum({ id: '1', name: 'X', release_date: '2022', release_date_precision: 'year' })).toBeNull();
  });
  it('classifies singles', () => {
    const rel = normalizeSpotifyAlbum({ id: '2', name: 'S', release_date: '2024-01-01', release_date_precision: 'day', album_type: 'single' }, 10);
    expect(rel?.meta).toMatchObject({ recordType: 'single' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/releases-normalize.test.ts`
Expected: FAIL — `normalizeSpotifyAlbum` is not exported.

- [ ] **Step 3: Append the implementation**

Add to `src/lib/releases-normalize.ts`:

```ts
export interface SpotifyAlbum {
  id: string; name: string; release_date: string;
  release_date_precision: 'day' | 'month' | 'year';
  images?: { url: string }[]; artists?: { name: string }[];
  album_type?: 'album' | 'single' | 'compilation';
}

// Spotify search returns simplified albums WITHOUT popularity; the orchestrator
// resolves popularity via a second /albums batch call and passes it in here.
export function normalizeSpotifyAlbum(a: SpotifyAlbum, popularity = 0): Release | null {
  if (a.release_date_precision !== 'day') return null; // need an exact calendar date
  return {
    id: `music:spotify:${a.id}`,
    vertical: 'music',
    title: a.name,
    date: a.release_date,
    popularity: spotifyPopularity(popularity),
    image: a.images?.[0]?.url,
    meta: { vertical: 'music', artist: a.artists?.[0]?.name, recordType: a.album_type === 'single' ? 'single' : 'album' },
    sourceUrl: `https://open.spotify.com/album/${a.id}`,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/releases-normalize.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/releases-normalize.ts src/lib/releases-normalize.test.ts
git commit -m "feat(releases): Spotify album normalizer"
```

---

### Task 5: Fetch orchestrator script

**Files:**
- Create: `scripts/fetch-releases.ts`

This task is network integration code — verified by running it with live keys (Step 2), not by unit tests.

- [ ] **Step 1: Create the orchestrator**

`scripts/fetch-releases.ts`:

```ts
// Build-time/cron data fetcher for the release calendar. Run via tsx:
//   npx tsx scripts/fetch-releases.ts --mode active     (nightly: recent past → +18mo)
//   npx tsx scripts/fetch-releases.ts --mode backfill   (one-time: 5yr history → archive)
// Writes a curated Release[] (notable-only, affiliate links attached) to the dataset
// the Plan A loader reads. Last-good per vertical: a failing/empty source keeps the
// prior entries rather than blanking the calendar.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Release } from '../src/data/releases-types';
import { RELEASE_CONFIG } from '../src/lib/releases-config';
import { filterNotable } from '../src/lib/releases-notable';
import { buildAmazonLink } from '../src/lib/releases-affiliate';
import { groupByVertical } from '../src/lib/releases-view';
import {
  normalizeTmdbMovie, normalizeTmdbTv, normalizeIgdbGame, normalizeSpotifyAlbum,
} from '../src/lib/releases-normalize';

const MODE = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : 'active';
const DATA_DIR = path.join(process.cwd(), 'src/data');
const OUT_FILE = path.join(DATA_DIR, MODE === 'backfill' ? 'releases-archive.json' : 'releases-active.json');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}
function isoAddDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function isoAddMonths(iso: string, months: number): string {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

const TODAY = new Date().toISOString().slice(0, 10);
const cfg = RELEASE_CONFIG;
// active = [today-60d, today+18mo]; backfill = [today-5yr, today-61d]
const GTE = MODE === 'backfill' ? isoAddMonths(TODAY, -12 * cfg.archiveYears) : isoAddDays(TODAY, -cfg.activePastDays);
const LTE = MODE === 'backfill' ? isoAddDays(TODAY, -cfg.activePastDays - 1) : isoAddMonths(TODAY, cfg.activeFutureMonths);

// ---- TMDB (movies + TV) -------------------------------------------------------
const TMDB = 'https://api.themoviedb.org/3';
async function tmdbDiscover(kind: 'movie' | 'tv'): Promise<Release[]> {
  const key = requireEnv('TMDB_API_KEY');
  const field = kind === 'movie' ? 'primary_release_date' : 'first_air_date';
  const out: Release[] = [];
  for (let page = 1; page <= 25; page++) {
    const url = `${TMDB}/discover/${kind}?api_key=${key}&include_adult=false&sort_by=popularity.desc`
      + `&${field}.gte=${GTE}&${field}.lte=${LTE}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB ${kind} ${res.status}`);
    const json: any = await res.json();
    for (const item of json.results ?? []) {
      const rel = kind === 'movie' ? normalizeTmdbMovie(item) : normalizeTmdbTv(item);
      if (rel) out.push(rel);
    }
    if (page >= (json.total_pages ?? 1)) break;
  }
  return out;
}

// ---- IGDB (games, via Twitch app token) ---------------------------------------
async function igdbToken(): Promise<string> {
  const id = requireEnv('TWITCH_CLIENT_ID'); const secret = requireEnv('TWITCH_CLIENT_SECRET');
  const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: 'POST' });
  if (!res.ok) throw new Error(`Twitch token ${res.status}`);
  return ((await res.json()) as any).access_token as string;
}
async function igdbGames(): Promise<Release[]> {
  const id = requireEnv('TWITCH_CLIENT_ID'); const token = await igdbToken();
  const gte = Math.floor(Date.parse(GTE + 'T00:00:00Z') / 1000);
  const lte = Math.floor(Date.parse(LTE + 'T00:00:00Z') / 1000);
  const out: Release[] = [];
  for (let offset = 0; offset < 5000; offset += 500) {
    const body = `fields id,name,first_release_date,total_rating,hypes,cover.url;`
      + ` where first_release_date >= ${gte} & first_release_date <= ${lte} & game_type = 0;`
      + ` sort hypes desc; limit 500; offset ${offset};`;
    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: { 'Client-ID': id, Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body,
    });
    if (!res.ok) throw new Error(`IGDB ${res.status}`);
    const games: any[] = await res.json();
    for (const g of games) { const rel = normalizeIgdbGame(g); if (rel) out.push(rel); }
    if (games.length < 500) break;
    await sleep(300); // ~4 req/s ceiling
  }
  return out;
}

// ---- Spotify (music) ----------------------------------------------------------
async function spotifyToken(): Promise<string> {
  const id = requireEnv('SPOTIFY_CLIENT_ID'); const secret = requireEnv('SPOTIFY_CLIENT_SECRET');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Spotify token ${res.status}`);
  return ((await res.json()) as any).access_token as string;
}
async function spotifyPopularities(ids: string[], token: string): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    if (!batch.length) break;
    const res = await fetch(`https://api.spotify.com/v1/albums?ids=${batch.join(',')}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { await sleep(500); continue; }
    const json: any = await res.json();
    for (const a of json.albums ?? []) if (a) m.set(a.id, a.popularity ?? 0);
    await sleep(150);
  }
  return m;
}
async function spotifyAlbums(): Promise<Release[]> {
  const token = await spotifyToken();
  const startY = Number(GTE.slice(0, 4)); const endY = Number(LTE.slice(0, 4));
  const out: Release[] = [];
  for (let year = startY; year <= endY; year++) {
    for (let offset = 0; offset <= 950; offset += 50) {
      const q = encodeURIComponent(`year:${year} tag:new`);
      const res = await fetch(`https://api.spotify.com/v1/search?type=album&limit=50&offset=${offset}&q=${q}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 429) { await sleep(2000); offset -= 50; continue; }
      if (!res.ok) throw new Error(`Spotify search ${res.status}`);
      const json: any = await res.json();
      const items: any[] = json.albums?.items ?? [];
      const ids = items.filter((a) => a.album_type !== 'compilation').map((a) => a.id);
      const pops = await spotifyPopularities(ids, token);
      for (const a of items) {
        const rel = normalizeSpotifyAlbum(a, pops.get(a.id) ?? 0);
        if (rel && rel.date >= GTE && rel.date <= LTE) out.push(rel);
      }
      if (items.length < 50) break;
      await sleep(150);
    }
  }
  return out;
}

// ---- orchestration ------------------------------------------------------------
function loadExisting(): Release[] {
  return existsSync(OUT_FILE) ? (JSON.parse(readFileSync(OUT_FILE, 'utf8')) as Release[]) : [];
}
async function safe(label: string, fetcher: () => Promise<Release[]>, fallback: Release[]): Promise<Release[]> {
  try {
    const got = await fetcher();
    if (got.length === 0) { console.warn(`[${label}] returned 0 — keeping ${fallback.length} prior entries`); return fallback; }
    console.log(`[${label}] ${got.length} raw`);
    return got;
  } catch (e) {
    console.warn(`[${label}] failed (${e}) — keeping ${fallback.length} prior entries`);
    return fallback;
  }
}

async function main() {
  console.log(`Fetching releases [mode=${MODE}] window ${GTE}..${LTE}`);
  const priorBy = groupByVertical(loadExisting());
  const [movies, tv, games, music] = await Promise.all([
    safe('tmdb:movie', () => tmdbDiscover('movie'), priorBy.movie),
    safe('tmdb:tv', () => tmdbDiscover('tv'), priorBy.tv),
    safe('igdb:game', igdbGames, priorBy.game),
    safe('spotify:music', spotifyAlbums, priorBy.music),
  ]);

  const notable = filterNotable([...movies, ...tv, ...games, ...music])
    .map((r) => ({ ...r, amazonUrl: buildAmazonLink(r) }));

  const byId = new Map<string, Release>();
  for (const r of notable) byId.set(r.id, r);
  const deduped = [...byId.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.popularity - a.popularity));

  writeFileSync(OUT_FILE, JSON.stringify(deduped));
  console.log(`Wrote ${deduped.length} notable releases → ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run it against live APIs (active mode)**

With all five env vars set, run: `npx tsx scripts/fetch-releases.ts --mode active`
Expected: per-source raw counts logged, then `Wrote N notable releases → src/data/releases-active.json` with N > 0.

**Verify the live shapes match the fixtures:** open `src/data/releases-active.json` and spot-check ~5 entries per vertical — correct titles, sensible `date`, working `image` URLs, `popularity` in 0..100, and `sourceUrl`/`amazonUrl` that resolve in a browser. If any field is wrong, fix the corresponding normalizer (Tasks 2–4) and its fixture, then re-run.

- [ ] **Step 3: Confirm the site renders the data**

Run: `npm run build` then `npm run preview`; open `/releases/` and the current month page.
Expected: real release cards render (no longer empty states).

- [ ] **Step 4: Commit (script only — data is committed by Task 7 after calibration)**

```bash
git add scripts/fetch-releases.ts
git commit -m "feat(releases): fetch orchestrator (TMDB + IGDB + Spotify, last-good)"
```

---

### Task 6: Nightly GitHub Action

**Files:**
- Create: `.github/workflows/refresh-releases.yml`

- [ ] **Step 1: Create the workflow**

`.github/workflows/refresh-releases.yml`:

```yaml
name: Refresh release calendar
on:
  schedule:
    - cron: '0 7 * * *'   # 07:00 UTC nightly
  workflow_dispatch: {}     # allow manual runs from the Actions tab
permissions:
  contents: write
concurrency:
  group: refresh-releases
  cancel-in-progress: true
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Fetch active-window releases
        run: npx tsx scripts/fetch-releases.ts --mode active
        env:
          TMDB_API_KEY: ${{ secrets.TMDB_API_KEY }}
          TWITCH_CLIENT_ID: ${{ secrets.TWITCH_CLIENT_ID }}
          TWITCH_CLIENT_SECRET: ${{ secrets.TWITCH_CLIENT_SECRET }}
          SPOTIFY_CLIENT_ID: ${{ secrets.SPOTIFY_CLIENT_ID }}
          SPOTIFY_CLIENT_SECRET: ${{ secrets.SPOTIFY_CLIENT_SECRET }}
      - name: Commit & push if the dataset changed
        run: |
          git config user.name "datelore-bot"
          git config user.email "actions@users.noreply.github.com"
          git add src/data/releases-active.json
          if git diff --staged --quiet; then
            echo "No release changes today."
          else
            git commit -m "chore(releases): nightly data refresh [skip ci]"
            git push
          fi
```

- [ ] **Step 2: Note the activation requirements (no command — these are manual GitHub steps)**

This workflow only does useful work once: (a) the branch is merged to the default branch, (b) the five secrets are added under repo Settings → Secrets and variables → Actions, and (c) Actions has write permission (Settings → Actions → General → Workflow permissions → "Read and write"). The push it makes triggers the normal Cloudflare build. Record these in the PR description / handoff.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/refresh-releases.yml
git commit -m "ci(releases): nightly GitHub Action to refresh + commit the dataset"
```

---

### Task 7: 5-year backfill, threshold calibration & final verification

**Files:**
- Modify: `src/data/releases-archive.json` (regenerated from `[]` seed)
- Modify: `src/data/releases-active.json` (regenerated from `[]` seed)
- Possibly modify: `src/lib/releases-config.ts` (tune `minPopularity` per vertical)

- [ ] **Step 1: Run the one-time backfill**

With env vars set, run: `npx tsx scripts/fetch-releases.ts --mode backfill`
Expected: `Wrote N notable releases → src/data/releases-archive.json` covering ~5 years of history.

- [ ] **Step 2: Calibrate the notability thresholds**

Inspect counts and quality:
- `node -e "console.log(require('./src/data/releases-active.json').length)"` and the archive count.
- Open both files and judge signal/noise per vertical. If a vertical floods with obscure entries, raise its `minPopularity` in `src/lib/releases-config.ts`; if it's too sparse, lower it. (IGDB hype-based scores and Spotify popularity scale differently from TMDB — expect different thresholds.)
- Re-run both modes after any config change so the committed data reflects the final thresholds.

- [ ] **Step 3: Refresh the active window with final thresholds**

Run: `npx tsx scripts/fetch-releases.ts --mode active`

- [ ] **Step 4: Full verification**

Run: `npm test` (expect all suites green — normalizers included)
Run: `npm run build` (expect success; `/releases/` and month pages now render real cards)
Run: `npm run preview` and click through `/releases/`, a month page, and a day page that has historical releases (confirm the "Released on this day" section appears).

- [ ] **Step 5: Commit the real datasets**

```bash
git add src/data/releases-archive.json src/data/releases-active.json src/lib/releases-config.ts
git commit -m "feat(releases): 5-year backfill + calibrated thresholds (real data)"
```

---

## Self-Review

**1. Spec coverage (pipeline slice):**
- Spec §"Pipeline / per-source normalizers" → Tasks 1–4. ✓
- Spec §"Pluggable popularity provider, last-good resilience" → Task 5 (`safe()` fallback; Spotify popularity resolved separately and injected). ✓
- Spec §"Window strategy (deep archive + active window)" → Task 5 (`--mode`) + Task 7 (backfill). ✓
- Spec §"Curation thresholds tunable in config" → Task 7 Step 2 (+ Plan A's `RELEASE_CONFIG`). ✓
- Spec §"Nightly GitHub Action → commit → Cloudflare build" → Task 6. ✓
- Spec §"5-year backfill into archive" → Task 7. ✓
- Spec §"API compliance / secrets" → prerequisites block + Task 6 env. ✓

**2. Placeholder scan:** No "TBD/handle later" placeholders; all code is complete. The `any` casts on raw JSON responses are deliberate (untyped third-party payloads), not stubs. The live-data caveat is an explicit verification step (Task 5 Step 2), not a deferral. ✓

**3. Type consistency:** `tmdbPopularity`/`igdbPopularity`/`spotifyPopularity`/`isoFromUnix` (Task 1) are used by the normalizers (Tasks 2–4); `normalizeTmdbMovie`/`normalizeTmdbTv`/`normalizeIgdbGame`/`normalizeSpotifyAlbum` signatures match their call sites in the orchestrator (Task 5). The script imports `RELEASE_CONFIG`, `filterNotable`, `buildAmazonLink`, `groupByVertical` exactly as Plans A/B export them. Output files match the loader's imports (`releases-archive.json`, `releases-active.json`). ✓

## Feature complete after this plan

With Plan C executed, all three plans are done: tested data foundation (A), rendered surfaces (B), and live auto-refreshing data (C). Remaining non-code steps: add the five repo secrets, set Actions write permission, and merge `feature/release-calendar` to `main` (which deploys via Cloudflare and starts the nightly refresh).
