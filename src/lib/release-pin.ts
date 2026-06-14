// src/lib/release-pin.ts
// Pure builder for the evergreen "Released on this day" pin, a sibling to bornPin/historyPin.
// Picks the most notable anniversary releases for a month-day and returns a PinSpec the seeder
// writes to src/data/pins/<MM>/<DD>/release.json. Returns null on a sparse day (no filler).
import type { Release } from '../data/releases-types';
import type { PinSpec } from './pin-spec';
import { SENSITIVE } from './pin-card';
import { monthName } from './slug';

// Notability floor on the 0..100 popularity score. Higher = fewer, bigger titles only.
// Tune for coverage vs. quality; the seeder reports how many days qualify.
export const RELEASE_PIN_MIN_POP = 50;
export const RELEASE_PIN_MAX_ITEMS = 3;

/** dayReleases = every release whose month-day matches (any year). */
export function releasePin(mm: number, dd: number, dayReleases: Release[]): PinSpec | null {
  const notable = dayReleases
    .filter((r) => r.popularity >= RELEASE_PIN_MIN_POP)
    .filter((r) => !SENSITIVE.test(r.title))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, RELEASE_PIN_MAX_ITEMS);
  if (notable.length === 0) return null;

  const lines = notable.map((r) => `${r.date.slice(0, 4)} · ${r.title}`);
  return {
    id: 'release',
    kind: 'release',
    board: 'Released On This Day',
    kicker: 'Released On This Day',
    title: `Released on ${monthName(mm)} ${dd}`,
    lines,
    hashtags: ['#OnThisDay', '#OnThisDayInHistory', '#PopCulture'],
    attribution: 'Sources: TMDB · IGDB · MusicBrainz',
    generated: true,
  };
}
