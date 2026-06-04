import { describe, it, expect } from 'vitest';
import {
  verticalLabel, monthsInWindow, configuredMonthWindow, monthLabel, formatReleaseDate, groupByVertical,
} from './releases-view';
import type { Release } from '../data/releases-types';

const r = (over: Partial<Release>): Release => ({
  id: 'movie:tmdb:1', vertical: 'movie', title: 'X', date: '2026-06-10',
  popularity: 50, meta: { vertical: 'movie' }, sourceUrl: 'https://example.test', ...over,
});

describe('verticalLabel', () => {
  it('maps verticals to display labels', () => {
    expect(verticalLabel('game')).toBe('Game');
    expect(verticalLabel('tv')).toBe('TV');
  });
});

describe('monthsInWindow', () => {
  it('spans past..future months oldest-first, including the current month', () => {
    expect(monthsInWindow('2026-06-10', 1, 2)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08']);
  });
  it('handles year boundaries', () => {
    expect(monthsInWindow('2026-01-15', 2, 0)).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});

describe('configuredMonthWindow', () => {
  it('derives the window from the release config (2 past + current + 18 future = 21)', () => {
    expect(configuredMonthWindow('2026-06-10')).toHaveLength(21);
  });
});

describe('monthLabel', () => {
  it('formats YYYY-MM as a readable month', () => {
    expect(monthLabel('2026-06')).toBe('June 2026');
  });
});

describe('formatReleaseDate', () => {
  it('formats an ISO date without timezone math', () => {
    expect(formatReleaseDate('2026-06-10')).toBe('June 10, 2026');
  });
});

describe('groupByVertical', () => {
  it('buckets releases into the four verticals, preserving order', () => {
    const groups = groupByVertical([r({ id: 'a', vertical: 'game', meta: { vertical: 'game' } }), r({ id: 'b' })]);
    expect(groups.game.map((x) => x.id)).toEqual(['a']);
    expect(groups.movie.map((x) => x.id)).toEqual(['b']);
    expect(groups.music).toEqual([]);
  });
});
