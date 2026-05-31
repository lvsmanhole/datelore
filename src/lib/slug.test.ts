import { describe, it, expect } from 'vitest';
import {
  toSlug, slugFromParts, fromSlug, monthName, dayOfYear, ordinal, sortKeysByDate,
} from './slug';

describe('toSlug / fromSlug', () => {
  it('maps data keys to readable slugs', () => {
    expect(toSlug('05-31')).toBe('may-31');
    expect(toSlug('12-25')).toBe('december-25');
    expect(toSlug('07-04')).toBe('july-4');
    expect(toSlug('01-01')).toBe('january-1');
  });

  it('slugFromParts builds the same slug', () => {
    expect(slugFromParts(5, 31)).toBe('may-31');
  });

  it('round-trips back to the zero-padded key', () => {
    for (const key of ['01-01', '05-31', '07-04', '12-25', '02-29']) {
      expect(fromSlug(toSlug(key))).toBe(key);
    }
  });

  it('rejects impossible or malformed slugs', () => {
    expect(fromSlug('may-99')).toBeNull();
    expect(fromSlug('smarch-3')).toBeNull();
    expect(fromSlug('june-31')).toBeNull(); // June has 30 days
    expect(fromSlug('birthday')).toBeNull();
  });
});

describe('dayOfYear (non-leap counting)', () => {
  it('matches known ordinals', () => {
    expect(dayOfYear(1, 1)).toBe(1);
    expect(dayOfYear(5, 31)).toBe(151);
    expect(dayOfYear(7, 4)).toBe(185);
    expect(dayOfYear(12, 25)).toBe(359);
  });
});

describe('ordinal', () => {
  it('adds correct suffixes', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(151)).toBe('151st');
  });
});

describe('sortKeysByDate', () => {
  it('orders keys by calendar position', () => {
    expect(sortKeysByDate(['12-25', '01-01', '07-04', '05-31']))
      .toEqual(['01-01', '05-31', '07-04', '12-25']);
  });
});

describe('monthName', () => {
  it('returns the full month name', () => {
    expect(monthName(5)).toBe('May');
    expect(monthName(12)).toBe('December');
  });
});
