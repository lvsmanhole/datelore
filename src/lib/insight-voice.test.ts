import { describe, it, expect } from 'vitest';
import { insightProse } from './insight-voice';
import type { InsightData } from './insights';

const base: InsightData = {
  dateLabel: 'May 31',
  eventCount: 10,
  span: { earliest: 1700, latest: 2011, years: 311 },
  dominantEra: '20th century',
  theme: 'conflict is a recurring thread',
  birthCount: 8,
  historyPercentile: 50,
  topAnniversary: null,
};

describe('insightProse', () => {
  it('leads with a round anniversary when present', () => {
    const s = insightProse({ ...base, topAnniversary: { year: 1926, title: 'the General Strike', yearsAgo: 100 } });
    expect(s).toMatch(/100th anniversary|100 years on/);
    expect(s).toContain('the General Strike');
  });
  it('flags unusually deep-history dates (high span rank)', () => {
    const s = insightProse({ ...base, historyPercentile: 95, topAnniversary: null });
    expect(s.toLowerCase()).toMatch(/far back|runs unusually deep|long memory|reach back/);
  });
  it('flags unusually compressed-history dates (low span rank)', () => {
    const s = insightProse({ ...base, historyPercentile: 10, topAnniversary: null });
    expect(s.toLowerCase()).toMatch(/compressed|short memory|close to the present/);
  });
  it('renders BC years honestly, not as negatives', () => {
    const s = insightProse({ ...base, historyPercentile: 95, span: { earliest: -509, latest: 2011, years: 2520 }, topAnniversary: null });
    expect(s).toContain('509 BC');
    expect(s).not.toContain('-509');
  });
  it('adds an era/theme observation as a second beat', () => {
    expect(insightProse(base)).toContain('20th century');
  });
  it('never emits percent signs or the old "By the numbers" framing', () => {
    const s = insightProse(base);
    expect(s).not.toContain('%');
    expect(s).not.toContain('By the numbers');
    expect(s.length).toBeGreaterThan(0);
  });
  it('always returns non-empty prose, even with no computed signals', () => {
    const empty: InsightData = {
      dateLabel: 'February 30', eventCount: 0, span: null, dominantEra: null,
      theme: null, birthCount: 0, historyPercentile: null, topAnniversary: null,
    };
    expect(insightProse(empty).length).toBeGreaterThan(0);
  });
});
