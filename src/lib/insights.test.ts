import { describe, it, expect } from 'vitest';
import { buildInsightData } from './insights';
import type { DayEntry } from '../data/types';

const entry: DayEntry = {
  lede: '',
  events: [
    { year: 1900, title: 'A war begins', desc: 'A great war and battle', tag: 'war' },
    { year: 1926, title: 'A treaty', desc: 'A treaty is signed', tag: 'treaty' },
    { year: 1965, title: 'A battle', desc: 'A military battle', tag: 'war' },
  ],
  births: [
    { monogram: 'A', name: 'Alice', year: 1850, line: 'British author' },
    { monogram: 'B', name: 'Bob', year: 1900, line: 'American actor' },
  ],
  deaths: [],
  observances: [],
};

describe('buildInsightData', () => {
  const d = buildInsightData(entry, 7, 4, { eventPercentile: 90, currentYear: 2026 });

  it('labels the date and counts events/births', () => {
    expect(d.dateLabel).toBe('July 4');
    expect(d.eventCount).toBe(3);
    expect(d.birthCount).toBe(2);
  });
  it('computes the event-year span', () => {
    expect(d.span).toEqual({ earliest: 1900, latest: 1965, years: 65 });
  });
  it('detects the dominant century and a conflict theme', () => {
    expect(d.dominantEra).toBe('20th century');
    expect(d.theme).toBe('conflict is a recurring thread');
  });
  it('passes through the corpus percentile', () => {
    expect(d.eventPercentile).toBe(90);
  });
  it('surfaces a round-number anniversary relative to currentYear', () => {
    expect(d.topAnniversary).toMatchObject({ year: 1926, yearsAgo: 100, title: 'A treaty' });
  });
  it('omits anniversary + percentile when no context is given', () => {
    const bare = buildInsightData(entry, 7, 4);
    expect(bare.eventPercentile).toBeNull();
    expect(bare.topAnniversary).toBeNull();
  });
});
