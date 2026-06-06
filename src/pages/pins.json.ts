// Posting manifest for the Pinterest distribution engine, served at /pins.json.
// Each entry pairs a generated pin image (same-origin /pin/*.png) with its UTM'd
// destination, a ready-to-post title + description, and a target board. The owner
// (or a Pinterest-API scheduler) reads this to post in dripped batches — never all
// at once. Built statically; no runtime cost.
import type { APIRoute } from 'astro';
import { DATES } from '../data/dates.js';
import { toSlug, monthName } from '../lib/slug';
import { SITE_ORIGIN, pinDestination } from '../lib/utm';
import { bornPin, historyPin } from '../lib/pin-card';

export interface PinManifestEntry {
  kind: 'born' | 'history';
  day: string; // slug, e.g. 'may-31'
  image: string; // absolute, same-origin pin PNG
  link: string; // UTM'd day-page destination
  title: string; // pin title
  description: string; // pin description (board copy)
  board: string; // suggested Pinterest board
}

export const GET: APIRoute = () => {
  const pins: PinManifestEntry[] = [];
  for (const key of Object.keys(DATES)) {
    const slug = toSlug(key);
    const [mm, dd] = key.split('-').map(Number);
    const entry = DATES[key];

    const born = bornPin(monthName(mm), mm, dd, entry);
    pins.push({
      kind: 'born',
      day: slug,
      image: `${SITE_ORIGIN}/pin/${slug}-born.png`,
      link: pinDestination(slug, 'born'),
      title: born.title,
      description: `${born.lines.join(' · ')} — see who shares your birthday and the full story of ${monthName(mm)} ${dd} on DateLore.`,
      board: 'Born On This Day',
    });

    const hist = historyPin(monthName(mm), dd, entry);
    pins.push({
      kind: 'history',
      day: slug,
      image: `${SITE_ORIGIN}/pin/${slug}-history.png`,
      link: pinDestination(slug, 'history'),
      title: hist.title,
      description: `${hist.lines.join(' · ')} — events, famous births, and observances for ${monthName(mm)} ${dd} on DateLore.`,
      board: 'On This Day in History',
    });
  }
  return new Response(JSON.stringify({ count: pins.length, pins }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
