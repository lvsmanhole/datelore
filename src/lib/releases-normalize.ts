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
