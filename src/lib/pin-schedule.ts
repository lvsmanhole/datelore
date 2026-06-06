// Pure scheduling for the auto-poster: pick the next batch of pins to publish,
// deduped against an already-posted ledger and ordered so seasonally-relevant dates
// go out ~2 weeks ahead of time (Pinterest favors fresh pins, and people search
// "born on december 25" near the date). Everything else marches forward by calendar
// proximity so the whole 366-day set drips out over the year. No I/O — unit-tested.
import { dayOfYear, fromSlug } from './slug';
import type { PinManifestEntry } from './pins-manifest';

/** Stable unique id for a pin (matches the posted-ledger entries). */
export function pinId(p: { day: string; kind: string }): string {
  return `${p.day}-${p.kind}`;
}

/** Forward calendar distance in days from today to a day-slug, 0..364 (0 = today). */
export function forwardDays(todayMonth: number, todayDay: number, daySlug: string): number {
  const key = fromSlug(daySlug);
  if (!key) return Number.MAX_SAFE_INTEGER; // unparseable → sink to the back
  const [m, d] = key.split('-').map(Number);
  const today = dayOfYear(todayMonth, todayDay);
  const target = dayOfYear(m, d);
  return (target - today + 365) % 365;
}

export interface SelectOpts {
  manifest: PinManifestEntry[];
  posted: Set<string> | string[]; // ids already published
  todayMonth: number; // 1..12
  todayDay: number; // 1..31
  quota: number; // max pins to return
  leadDays?: number; // prioritize dates within this many days ahead (default 14)
}

/**
 * Return up to `quota` not-yet-posted pins. Pins whose date falls within `leadDays`
 * ahead come first (nearest date first); the rest follow by forward proximity. Ties
 * break deterministically by id so runs are reproducible.
 */
export function selectNextBatch(opts: SelectOpts): PinManifestEntry[] {
  const { manifest, todayMonth, todayDay } = opts;
  const quota = Math.max(0, opts.quota);
  const leadDays = opts.leadDays ?? 14;
  const posted = opts.posted instanceof Set ? opts.posted : new Set(opts.posted);

  const scored = manifest
    .filter((p) => !posted.has(pinId(p)))
    .map((p) => ({ p, d: forwardDays(todayMonth, todayDay, p.day) }));

  scored.sort((a, b) => {
    const aIn = a.d <= leadDays ? 0 : 1;
    const bIn = b.d <= leadDays ? 0 : 1;
    if (aIn !== bIn) return aIn - bIn; // in-window dates first
    if (a.d !== b.d) return a.d - b.d; // then nearest upcoming date
    return pinId(a.p) < pinId(b.p) ? -1 : 1; // deterministic tie-break
  });

  return scored.slice(0, quota).map((s) => s.p);
}
