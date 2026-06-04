import { describe, it, expect } from 'vitest';
import { tmdbPopularity, igdbPopularity, spotifyPopularity, isoFromUnix } from './releases-normalize';

describe('popularity scalers (all clamp to 0..100)', () => {
  it('tmdb clamps its unbounded score', () => {
    expect(tmdbPopularity(12.3)).toBe(12);
    expect(tmdbPopularity(450)).toBe(100);
    expect(tmdbPopularity(-5)).toBe(0);
  });
  it('igdb prefers total_rating, falls back to hype count', () => {
    expect(igdbPopularity({ total_rating: 88 })).toBe(88);
    expect(igdbPopularity({ hypes: 40 })).toBe(100); // 40*3 clamped
    expect(igdbPopularity({ hypes: 10 })).toBe(30);
    expect(igdbPopularity({})).toBe(0);
  });
  it('spotify passes its 0..100 score through', () => {
    expect(spotifyPopularity(73)).toBe(73);
  });
});

describe('isoFromUnix', () => {
  it('converts unix seconds to a UTC YYYY-MM-DD', () => {
    expect(isoFromUnix(0)).toBe('1970-01-01');
    expect(isoFromUnix(1704067200)).toBe('2024-01-01');
  });
});
