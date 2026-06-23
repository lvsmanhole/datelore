import { describe, it, expect } from 'vitest';
import { buildCorpusStats, percentileRank } from './corpus-stats';
import type { DayEntry } from '../data/types';

const mk = (n: number): DayEntry => ({
  lede: '',
  events: Array.from({ length: n }, (_, i) => ({ year: 2000 + i, title: 'x', desc: '', tag: '' })),
  births: [], deaths: [], observances: [],
});

describe('buildCorpusStats', () => {
  it('summarizes event counts across the corpus', () => {
    const s = buildCorpusStats([mk(1), mk(3), mk(5)]);
    expect(s.totalDays).toBe(3);
    expect(s.eventCountsAsc).toEqual([1, 3, 5]);
    expect(s.avgEvents).toBe(3);
  });
});

describe('percentileRank', () => {
  const asc = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it('is 100 at the max, ~50 at the median, low at the bottom', () => {
    expect(percentileRank(10, asc)).toBe(100);
    expect(percentileRank(5, asc)).toBe(50);
    expect(percentileRank(1, asc)).toBe(10);
  });
  it('returns 0 for an empty corpus', () => {
    expect(percentileRank(5, [])).toBe(0);
  });
});
