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
  eventPercentile: 50,
  topAnniversary: null,
};

describe('insightProse', () => {
  it('leads with a round anniversary when present', () => {
    const s = insightProse({ ...base, topAnniversary: { year: 1926, title: 'the General Strike', yearsAgo: 100 } });
    expect(s).toMatch(/100th anniversary|100 years on/);
    expect(s).toContain('the General Strike');
  });
  it('flags unusually busy dates by percentile', () => {
    const s = insightProse({ ...base, eventPercentile: 95, topAnniversary: null });
    expect(s.toLowerCase()).toMatch(/busiest|busy|crowded|heavier/);
  });
  it('flags unusually quiet dates by percentile', () => {
    const s = insightProse({ ...base, eventPercentile: 10, topAnniversary: null });
    expect(s.toLowerCase()).toMatch(/quiet|light record|passed it by/);
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
});
