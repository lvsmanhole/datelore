import type { DayEvent } from '../data/types';

export interface Anniversary {
  year: number;
  title: string;
  yearsAgo: number;
}

/**
 * Round-number anniversaries of a day's events relative to `currentYear`.
 * "Round" = a positive multiple of 25 (25, 50, 75, 100, 150 …). Returned
 * most-significant first: centuries (÷100) outrank 50s outrank 25s; ties broken
 * by how many years ago. Computed, original framing — the source data has no
 * notion of "this year's anniversaries".
 */
export function roundAnniversaries(events: DayEvent[], currentYear: number): Anniversary[] {
  const out: Anniversary[] = [];
  for (const e of events) {
    const yearsAgo = currentYear - e.year;
    if (yearsAgo > 0 && yearsAgo % 25 === 0) {
      out.push({ year: e.year, title: e.title, yearsAgo });
    }
  }
  const weight = (y: number) => (y % 100 === 0 ? 3 : y % 50 === 0 ? 2 : 1);
  return out.sort((a, b) => weight(b.yearsAgo) - weight(a.yearsAgo) || b.yearsAgo - a.yearsAgo);
}
