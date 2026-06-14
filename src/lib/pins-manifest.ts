// Pure builder for the Pinterest posting manifest. Shared by the /pins.json endpoint
// (src/pages/pins.json.ts) and the auto-poster (scripts/post-to-pinterest.ts) so they
// can never drift — the poster reads the exact pins the site exposes, no network.
import { DATES } from '../data/dates.js';
import { toSlug, monthName } from './slug';
import { SITE_ORIGIN, pinDestination } from './utm';
import { bornPin, historyPin } from './pin-card';

export interface PinManifestEntry {
  kind: 'born' | 'history';
  day: string; // day slug, e.g. 'may-31'
  image: string; // absolute, same-origin pin PNG
  link: string; // UTM'd day-page destination
  title: string; // pin title
  description: string; // pin description (board copy)
  board: string; // suggested Pinterest board
}

/** Build every pin (born + history per day) in calendar order. */
export function buildPinManifest(): PinManifestEntry[] {
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
      link: pinDestination(slug, 'born-on'),
      title: born.title,
      description: `${born.lines.join(' · ')} — see who shares your birthday and the full story of ${monthName(mm)} ${dd} on DateLore.`,
      board: 'Born On This Day',
    });

    const hist = historyPin(monthName(mm), dd, entry);
    pins.push({
      kind: 'history',
      day: slug,
      image: `${SITE_ORIGIN}/pin/${slug}-history.png`,
      link: pinDestination(slug, 'on-this-day'),
      title: hist.title,
      description: `${hist.lines.join(' · ')} — events, famous births, and observances for ${monthName(mm)} ${dd} on DateLore.`,
      board: 'On This Day in History',
    });
  }
  return pins;
}
