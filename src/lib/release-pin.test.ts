// src/lib/release-pin.test.ts
import { describe, it, expect } from 'vitest';
import { releasePin, RELEASE_PIN_MIN_POP } from './release-pin';
import type { Release } from '../data/releases-types';

function rel(p: Partial<Release> & { title: string; date: string; popularity: number }): Release {
  return { id: `movie:test:${p.title}`, vertical: 'movie', meta: { vertical: 'movie' }, sourceUrl: 'https://x', ...p };
}

describe('releasePin', () => {
  it('returns null when no release clears the popularity floor', () => {
    expect(releasePin(6, 13, [rel({ title: 'Obscure', date: '2010-06-13', popularity: RELEASE_PIN_MIN_POP - 1 })])).toBeNull();
  });
  it('builds a release pin from the top notable anniversaries (year · title), newest first', () => {
    const p = releasePin(6, 13, [
      rel({ title: 'Get Out', date: '2017-06-13', popularity: 80 }),
      rel({ title: 'Jurassic World', date: '2015-06-13', popularity: 95 }),
    ])!;
    expect(p.id).toBe('release');
    expect(p.kind).toBe('release');
    expect(p.board).toBe('Released On This Day');
    expect(p.title).toBe('Released on June 13');
    expect(p.lines[0]).toBe('2015 · Jurassic World'); // popularity-sorted
    expect(p.generated).toBe(true);
  });
  it('caps to 3 lines', () => {
    const many = Array.from({ length: 6 }, (_, i) => rel({ title: `T${i}`, date: '2015-06-13', popularity: 90 - i }));
    expect(releasePin(6, 13, many)!.lines.length).toBe(3);
  });
  it('drops a release whose title trips the SENSITIVE filter', () => {
    const p = releasePin(6, 13, [
      rel({ title: 'The Massacre', date: '2016-06-13', popularity: 99 }),
      rel({ title: 'Inside Out', date: '2015-06-13', popularity: 88 }),
    ])!;
    expect(p.lines.join(' ')).toContain('Inside Out');
    expect(p.lines.join(' ').toLowerCase()).not.toContain('massacre');
  });
});
