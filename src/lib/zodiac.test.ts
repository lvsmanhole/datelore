import { describe, it, expect } from 'vitest';
import { signSlug, daysUnderSign } from './zodiac';

describe('signSlug', () => {
  it('lowercases the sign name into a URL slug', () => {
    expect(signSlug('Gemini')).toBe('gemini');
  });
});

describe('daysUnderSign', () => {
  it('selects only keys whose date falls under the sign (Gemini = May 21 – Jun 20)', () => {
    const keys = ['05-20', '05-21', '06-20', '06-21'];
    expect(daysUnderSign('Gemini', keys)).toEqual(['05-21', '06-20']);
  });
});
