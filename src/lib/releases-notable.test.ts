import { describe, it, expect } from 'vitest';
import { isNotable, filterNotable } from './releases-notable';
import type { Release } from '../data/releases-types';

const make = (over: Partial<Release>): Release => ({
  id: 'movie:tmdb:1', vertical: 'movie', title: 'X', date: '2026-06-10',
  popularity: 50, meta: { vertical: 'movie' }, sourceUrl: 'https://example.test', ...over,
});

describe('isNotable', () => {
  it('passes releases at or above the per-vertical threshold', () => {
    expect(isNotable(make({ popularity: 20 }))).toBe(true);
  });
  it('rejects releases below the threshold', () => {
    expect(isNotable(make({ popularity: 19 }))).toBe(false);
  });
});

describe('filterNotable', () => {
  it('keeps only notable releases', () => {
    const list = [make({ id: 'a', popularity: 80 }), make({ id: 'b', popularity: 5 })];
    expect(filterNotable(list).map((r) => r.id)).toEqual(['a']);
  });
});
