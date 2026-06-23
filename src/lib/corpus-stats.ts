// Corpus-wide statistics over the whole 366-day dataset, so a single day can be
// described relative to the calendar as a whole ("one of the busier dates"). This
// is genuinely original analysis — it exists nowhere in the source data. Pure core
// (buildCorpusStats / percentileRank) + a memoized DATES-backed accessor.
import { DATES } from '../data/dates.js';
import type { DayEntry } from '../data/types';

export interface CorpusStats {
  totalDays: number;
  eventCountsAsc: number[]; // every day's event count, ascending
  avgEvents: number;
}

export function buildCorpusStats(entries: DayEntry[]): CorpusStats {
  const counts = entries.map((e) => e.events.length);
  const eventCountsAsc = [...counts].sort((a, b) => a - b);
  const total = counts.reduce((sum, n) => sum + n, 0);
  return {
    totalDays: entries.length,
    eventCountsAsc,
    avgEvents: entries.length ? total / entries.length : 0,
  };
}

/**
 * Percentile rank of `value` within `sortedAsc` (0–100): the share of entries
 * less than or equal to `value`. `sortedAsc` MUST be ascending. Empty → 0.
 */
export function percentileRank(value: number, sortedAsc: number[]): number {
  if (sortedAsc.length === 0) return 0;
  let countLE = 0;
  for (const n of sortedAsc) {
    if (n <= value) countLE++;
    else break;
  }
  return Math.round((countLE / sortedAsc.length) * 100);
}

let _cache: CorpusStats | null = null;
/** Memoized stats over the real baked dataset (computed once per build). */
export function corpusStats(): CorpusStats {
  if (!_cache) _cache = buildCorpusStats(Object.values(DATES) as DayEntry[]);
  return _cache;
}
