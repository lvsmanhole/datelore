import { describe, it, expect } from 'vitest';
import {
  mergeReleases, sortReleases, releasesOn, releasesInMonth, releasesForDayPage, upcoming, loadReleases,
} from './releases';
import type { Release } from '../data/releases-types';

const r = (over: Partial<Release>): Release => ({
  id: 'movie:tmdb:1', vertical: 'movie', title: 'X', date: '2026-06-10',
  popularity: 50, meta: { vertical: 'movie' }, sourceUrl: 'https://example.test', ...over,
});

describe('mergeReleases', () => {
  it('lets active override archive entries with the same id', () => {
    const merged = mergeReleases({
      archive: [r({ id: 'a', title: 'Old' })],
      active: [r({ id: 'a', title: 'New' })],
    });
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('New');
  });
});

describe('sortReleases', () => {
  it('sorts by popularity desc then title asc', () => {
    const out = sortReleases([
      r({ id: '1', title: 'B', popularity: 10 }),
      r({ id: '2', title: 'A', popularity: 90 }),
      r({ id: '3', title: 'A', popularity: 10 }),
    ]);
    expect(out.map((x) => x.id)).toEqual(['2', '3', '1']);
  });
});

describe('releasesOn', () => {
  it('returns releases for an exact date, sorted', () => {
    const list = [
      r({ id: '1', date: '2026-06-10', popularity: 10 }),
      r({ id: '2', date: '2026-06-10', popularity: 90 }),
      r({ id: '3', date: '2026-06-11' }),
    ];
    expect(releasesOn(list, '2026-06-10').map((x) => x.id)).toEqual(['2', '1']);
  });
});

describe('releasesInMonth', () => {
  it('returns releases whose date falls in the given YYYY-MM', () => {
    const list = [
      r({ id: '1', date: '2026-06-01' }),
      r({ id: '2', date: '2026-06-30' }),
      r({ id: '3', date: '2026-07-01' }),
    ];
    expect(releasesInMonth(list, '2026-06').map((x) => x.id).sort()).toEqual(['1', '2']);
  });
});

describe('releasesForDayPage', () => {
  it('groups the same month-day across years, newest year first', () => {
    const list = [
      r({ id: '1', date: '2018-06-10' }),
      r({ id: '2', date: '2022-06-10' }),
      r({ id: '3', date: '2022-06-11' }),
    ];
    const groups = releasesForDayPage(list, 6, 10);
    expect(groups.map((g) => g.year)).toEqual([2022, 2018]);
    expect(groups[0].releases.map((x) => x.id)).toEqual(['2']);
  });
});

describe('upcoming', () => {
  it('returns soonest-first releases on or after today, limited', () => {
    const list = [
      r({ id: '1', date: '2026-06-09' }),
      r({ id: '2', date: '2026-06-11' }),
      r({ id: '3', date: '2026-06-15' }),
    ];
    expect(upcoming(list, '2026-06-10', 2).map((x) => x.id)).toEqual(['2', '3']);
  });
});

describe('loadReleases', () => {
  it('returns an array from the seed data files', () => {
    expect(Array.isArray(loadReleases())).toBe(true);
  });
});
