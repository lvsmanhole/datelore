import { describe, it, expect } from 'vitest';
import { DATES } from './dates';
import { toSlug, fromSlug } from '../lib/slug';

describe('DATES integrity (baked Wikimedia data)', () => {
  const keys = Object.keys(DATES);

  it('has all 366 month-days', () => {
    expect(keys.length).toBe(366);
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

  it('every entry parses and has the required shape', () => {
    for (const [key, e] of Object.entries(DATES)) {
      expect(e.lede, key).toBeTruthy();
      expect(Array.isArray(e.events), key).toBe(true);
      expect(Array.isArray(e.births), key).toBe(true);
      expect(Array.isArray(e.deaths), key).toBe(true);
      expect(Array.isArray(e.observances), key).toBe(true);
      for (const ev of e.events) {
        expect(typeof ev.year).toBe('number');
        expect(ev.title).toBeTruthy();
        expect(ev.desc).toBeTruthy();
        expect(ev.tag).toBeTruthy();
      }
    }
  });

  it('nearly every day has at least one event (the quiz needs a pool)', () => {
    const withEvents = keys.filter((k) => DATES[k].events.length > 0).length;
    expect(withEvents).toBeGreaterThan(360);
  });
});
