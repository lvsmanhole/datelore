import { describe, it, expect } from 'vitest';
import { dayInsights } from './insights';
import type { DayEntry } from '../data/types';

const entry: DayEntry = {
  lede: 'x',
  events: [
    { year: 1914, title: 'World War I begins', tag: 'war', desc: 'A great war' },
    { year: 1945, title: 'World War II ends', tag: 'war', desc: 'Another war battle' },
    { year: 1969, title: 'Moon landing', tag: 'space', desc: 'discover spacecraft' },
    { year: 1815, title: 'Battle of Waterloo', tag: 'battle', desc: 'a battle' },
  ],
  births: [
    { monogram: 'A', name: 'A', year: 1900, line: 'l' },
    { monogram: 'B', name: 'B', year: 1950, line: 'l' },
  ],
  deaths: [],
  observances: [],
};

describe('dayInsights', () => {
  const i = dayInsights(entry, 7, 4);

  it('computes the event count and year span', () => {
    expect(i.eventCount).toBe(4);
    expect(i.span).toEqual({ earliest: 1815, latest: 1969, years: 154 });
  });

  it('finds the dominant century (only when >= 2 events share it)', () => {
    expect(i.dominantEra).toBe('20th century'); // 1914, 1945, 1969
  });

  it('detects the strongest theme', () => {
    expect(i.theme).toBe('conflict is a recurring thread'); // war/battle x3 beats space x1
  });

  it('computes birth count and span', () => {
    expect(i.birthCount).toBe(2);
    expect(i.birthSpan).toEqual({ earliest: 1900, latest: 1950 });
  });

  it('assembles an original sentence from the parts', () => {
    expect(i.sentence).toContain('Across 4 recorded events, July 4 spans 154 years — from 1815 to 1969.');
    expect(i.sentence).toContain('20th century');
    expect(i.sentence).toContain('conflict is a recurring thread');
    expect(i.sentence).toContain('2 notable figures share the date, born between 1900 and 1950.');
  });

  it('does not assert a dominant era or theme when there is no concentration', () => {
    const sparse = dayInsights(
      { ...entry, events: [{ year: 1500, title: 'A quiet event', tag: 'misc', desc: 'nothing notable' }], births: [] },
      1,
      1,
    );
    expect(sparse.dominantEra).toBeNull();
    expect(sparse.theme).toBeNull();
    expect(sparse.eventCount).toBe(1);
    expect(sparse.sentence).toContain('single recorded event');
  });
});
