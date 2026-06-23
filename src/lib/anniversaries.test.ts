import { describe, it, expect } from 'vitest';
import { roundAnniversaries } from './anniversaries';
import type { DayEvent } from '../data/types';

const ev = (year: number, title: string): DayEvent => ({ year, title, desc: '', tag: '' });

describe('roundAnniversaries', () => {
  it('keeps only positive multiples of 25 and ranks centuries first', () => {
    const events = [ev(1926, 'A'), ev(1976, 'B'), ev(2001, 'C'), ev(2010, 'D'), ev(2030, 'E')];
    const r = roundAnniversaries(events, 2026);
    // 1926→100 (century), 1976→50, 2001→25; 2010→16 dropped; 2030 is future, dropped
    expect(r.map((a) => a.yearsAgo)).toEqual([100, 50, 25]);
    expect(r[0]).toMatchObject({ year: 1926, title: 'A', yearsAgo: 100 });
  });
  it('returns empty when nothing lines up', () => {
    expect(roundAnniversaries([ev(2010, 'X')], 2026)).toEqual([]);
  });
});
