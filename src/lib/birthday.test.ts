import { describe, it, expect } from 'vitest';
import { parseBirthdate, computeBirthday } from './birthday';

describe('parseBirthdate', () => {
  it('parses a valid ISO date', () => {
    expect(parseBirthdate('1990-05-31')).toEqual({ year: 1990, month: 5, day: 31 });
  });
  it('accepts a real leap day', () => {
    expect(parseBirthdate('2000-02-29')).toEqual({ year: 2000, month: 2, day: 29 });
  });
  it('rejects a non-existent date', () => {
    expect(parseBirthdate('2001-02-29')).toBeNull(); // 2001 is not a leap year
    expect(parseBirthdate('1990-13-01')).toBeNull();
    expect(parseBirthdate('not-a-date')).toBeNull();
  });
  it('rejects years before 1900', () => {
    expect(parseBirthdate('1000-01-01')).toBeNull();
    expect(parseBirthdate('1899-12-31')).toBeNull();
    expect(parseBirthdate('1900-01-01')).toEqual({ year: 1900, month: 1, day: 1 });
  });
});

describe('computeBirthday', () => {
  const now = new Date(2026, 5, 1); // June 1, 2026 (local)

  it('computes a full, correct card', () => {
    const stats = computeBirthday({ year: 1990, month: 5, day: 31 }, now)!;
    expect(stats).not.toBeNull();
    expect(stats.years).toBe(36);
    expect(stats.weekday).toBe('Thursday'); // May 31, 1990 was a Thursday
    expect(stats.zodiac).toBe('♊ Gemini');
    expect(stats.chinese).toBe('Year of the Horse');
    expect(stats.generation).toBe('Millennial');
    expect(stats.pretty).toBe('May 31st, 1990');
    expect(stats.totalDays).toBeGreaterThan(13000);
    expect(stats.daysToNext).toBeGreaterThanOrEqual(0);
    expect(stats.daysToNext).toBeLessThanOrEqual(366);
  });

  it('returns null for a future birthdate', () => {
    expect(computeBirthday({ year: 2030, month: 1, day: 1 }, now)).toBeNull();
  });

  it('does not over-count age before the birthday lands this year', () => {
    const early = new Date(2026, 0, 1); // Jan 1, 2026
    expect(computeBirthday({ year: 1990, month: 5, day: 31 }, early)!.years).toBe(35);
  });

  it('handles a Feb-29 birthday without crashing', () => {
    const stats = computeBirthday({ year: 2000, month: 2, day: 29 }, now)!;
    expect(stats.weekday).toBeTruthy();
    expect(stats.daysToNext).toBeGreaterThanOrEqual(0);
  });
});
