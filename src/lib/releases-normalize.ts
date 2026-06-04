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

// w185 matches the ~96px card display at 2x without over-fetching (Lighthouse: 'properly size images').
const TMDB_IMG = 'https://image.tmdb.org/t/p/w185';

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

export interface IgdbGame {
  id: number; name: string; first_release_date?: number;
  total_rating?: number; hypes?: number; cover?: { url?: string };
}
export function normalizeIgdbGame(g: IgdbGame): Release | null {
  if (!g.first_release_date) return null;
  // IGDB cover URLs are protocol-relative (//images.igdb.com/...); prefix https and
  // request the large art (t_thumb → t_cover_big).
  const cover = g.cover?.url ? `https:${g.cover.url}`.replace('t_thumb', 't_cover_big') : undefined;
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
