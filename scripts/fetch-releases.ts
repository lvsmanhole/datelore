// Build-time/cron data fetcher for the release calendar. Run via tsx:
//   npx tsx scripts/fetch-releases.ts --mode active     (nightly: recent past → +18mo)
//   npx tsx scripts/fetch-releases.ts --mode backfill   (one-time: 5yr history → archive)
// Writes a curated Release[] (notable-only, affiliate links attached) to the dataset
// the loader (src/lib/releases.ts) reads. Last-good per vertical: a failing/empty
// source keeps the prior entries rather than blanking the calendar.
//
// Requires env vars: TMDB_API_KEY, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET,
// SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET.
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
  const [movies, tv, games] = await Promise.all([
    safe('tmdb:movie', () => tmdbDiscover('movie'), priorBy.movie),
    safe('tmdb:tv', () => tmdbDiscover('tv'), priorBy.tv),
    safe('igdb:game', igdbGames, priorBy.game),
  ]);
  // Music is opt-in: only fetch when Spotify credentials are configured. Add the
  // SPOTIFY_* secrets later and the music vertical activates automatically.
  const music = (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET)
    ? await safe('spotify:music', spotifyAlbums, priorBy.music)
    : (console.log('[spotify:music] skipped — Spotify not configured'), priorBy.music);

  const notable = filterNotable([...movies, ...tv, ...games, ...music])
    .map((r) => ({ ...r, amazonUrl: buildAmazonLink(r) }));

  const byId = new Map<string, Release>();
  for (const r of notable) byId.set(r.id, r);
  const deduped = [...byId.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.popularity - a.popularity));

  writeFileSync(OUT_FILE, JSON.stringify(deduped));
  console.log(`Wrote ${deduped.length} notable releases → ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
