import { describe, it, expect } from 'vitest';
import {
  tmdbPopularity, igdbPopularity, spotifyPopularity, isoFromUnix,
  normalizeTmdbMovie, normalizeTmdbTv,
} from './releases-normalize';

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

describe('normalizeTmdbMovie', () => {
  it('maps a discover result to a Release', () => {
    const rel = normalizeTmdbMovie({ id: 693134, title: 'Dune: Part Two', release_date: '2024-03-01', popularity: 320.5, poster_path: '/abc.jpg' });
    expect(rel).toMatchObject({
      id: 'movie:tmdb:693134', vertical: 'movie', title: 'Dune: Part Two',
      date: '2024-03-01', popularity: 100,
      image: 'https://image.tmdb.org/t/p/w342/abc.jpg',
      sourceUrl: 'https://www.themoviedb.org/movie/693134',
    });
  });
  it('drops results with no release date', () => {
    expect(normalizeTmdbMovie({ id: 1, title: 'X', release_date: '', popularity: 50, poster_path: null })).toBeNull();
  });
});

describe('normalizeTmdbTv', () => {
  it('maps a discover result to a Release using name + first_air_date', () => {
    const rel = normalizeTmdbTv({ id: 94997, name: 'House of the Dragon', first_air_date: '2022-08-21', popularity: 88, poster_path: null });
    expect(rel).toMatchObject({ id: 'tv:tmdb:94997', vertical: 'tv', title: 'House of the Dragon', date: '2022-08-21', popularity: 88 });
    expect(rel?.image).toBeUndefined();
  });
});
