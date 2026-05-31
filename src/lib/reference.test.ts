import { describe, it, expect } from 'vitest';
import {
  zodiacForDate, chineseZodiacForYear, generationForYear,
  birthstoneForMonth, birthFlowerForMonth,
} from './reference';

describe('zodiacForDate', () => {
  it('returns the western sign + glyph for a date', () => {
    expect(zodiacForDate(5, 31)).toEqual({ sign: 'Gemini', glyph: '♊' });
    expect(zodiacForDate(7, 4)).toEqual({ sign: 'Cancer', glyph: '♋' });
    expect(zodiacForDate(1, 1)).toEqual({ sign: 'Capricorn', glyph: '♑' });
    expect(zodiacForDate(12, 25)).toEqual({ sign: 'Capricorn', glyph: '♑' });
  });

  it('handles the boundary days', () => {
    expect(zodiacForDate(5, 20).sign).toBe('Taurus');
    expect(zodiacForDate(5, 21).sign).toBe('Gemini');
  });
});

describe('chineseZodiacForYear', () => {
  it('maps years to animals', () => {
    expect(chineseZodiacForYear(1990)).toBe('Horse');
    expect(chineseZodiacForYear(2000)).toBe('Dragon');
  });
});

describe('generationForYear', () => {
  it('labels generations by birth year', () => {
    expect(generationForYear(1955)).toBe('Baby Boomer');
    expect(generationForYear(1975)).toBe('Generation X');
    expect(generationForYear(1990)).toBe('Millennial');
    expect(generationForYear(2005)).toBe('Generation Z');
    expect(generationForYear(2015)).toBe('Generation Alpha');
  });
});

describe('birthstone / birth flower by month', () => {
  it('matches the curated sample dates', () => {
    expect(birthstoneForMonth(5)).toBe('Emerald');
    expect(birthstoneForMonth(1)).toBe('Garnet');
    expect(birthstoneForMonth(7)).toBe('Ruby');
    expect(birthstoneForMonth(12)).toBe('Turquoise');
    expect(birthFlowerForMonth(5)).toBe('Lily of the Valley');
    expect(birthFlowerForMonth(7)).toBe('Larkspur');
    expect(birthFlowerForMonth(12)).toBe('Holly');
  });
});
