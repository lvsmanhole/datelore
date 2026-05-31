import { describe, it, expect } from 'vitest';
import { DATES } from './dates';
import { toSlug, fromSlug } from '../lib/slug';

describe('DATES integrity', () => {
  const keys = Object.keys(DATES);

  it('has at least the four sample dates', () => {
    expect(keys).toEqual(expect.arrayContaining(['01-01', '05-31', '07-04', '12-25']));
  });

  it('every key is a real, zero-padded MM-DD date', () => {
    for (const key of keys) {
      expect(key).toMatch(/^\d{2}-\d{2}$/);
      expect(fromSlug(toSlug(key))).toBe(key);
    }
  });

  it('produces unique slugs', () => {
    const slugs = keys.map(toSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every entry has the required shape and at least one event', () => {
    for (const [key, e] of Object.entries(DATES)) {
      expect(e.lede, key).toBeTruthy();
      expect(Array.isArray(e.events) && e.events.length >= 1, key).toBe(true);
      for (const ev of e.events) {
        expect(typeof ev.year).toBe('number');
        expect(ev.title).toBeTruthy();
        expect(ev.desc).toBeTruthy();
        expect(ev.tag).toBeTruthy();
      }
      for (const b of e.births) {
        expect(typeof b.year).toBe('number');
        expect(b.name).toBeTruthy();
        expect(b.monogram).toBeTruthy();
      }
      expect(Array.isArray(e.deaths), key).toBe(true);
      expect(Array.isArray(e.observances), key).toBe(true);
    }
  });
});
