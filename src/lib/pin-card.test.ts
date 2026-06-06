import { describe, it, expect } from 'vitest';
import { bornPin, historyPin } from './pin-card';
import { DATES } from '../data/dates.js';
import { toSlug, fromSlug, monthName } from './slug';
import type { DayEntry } from '../data/types';

const fixture: DayEntry = {
  lede: 'A test day with <b>markup</b> in the lede.',
  events: [{ year: 1879, title: 'Something notable happened', desc: 'a longer description', tag: 'event' }],
  births: [{ monogram: 'AL', name: 'Ada Lovelace', year: 1815, line: 'mathematician' }],
  deaths: [],
  observances: [],
};

describe('bornPin', () => {
  it('leads with zodiac and includes a birthday twin when present', () => {
    const p = bornPin('May', 5, 31, fixture);
    expect(p.title).toBe('Born on May 31?');
    expect(p.lines[0]).toContain('Gemini');
    expect(p.lines.some((l) => l.includes('Ada Lovelace') && l.includes('1815'))).toBe(true);
    expect(p.foot).toBe('datelore.com');
  });

  it('stays valid (non-empty) when a date has no births', () => {
    const p = bornPin('May', 5, 31, { ...fixture, births: [] });
    expect(p.lines.length).toBeGreaterThan(0);
    expect(p.lines.some((l) => l.includes('Birthstone'))).toBe(true);
  });
});

describe('historyPin', () => {
  it('leads with the top event and carries CC BY-SA attribution', () => {
    const p = historyPin('May', 31, fixture);
    expect(p.title).toBe('May 31 in History');
    expect(p.lines[0]).toContain('1879');
    expect(p.attribution).toContain('CC BY-SA');
  });

  it('falls back to the lede with HTML stripped when there are no events', () => {
    const p = historyPin('May', 31, { ...fixture, events: [] });
    expect(p.lines[0]).not.toContain('<b>');
    expect(p.lines[0]).toContain('test day');
  });

  it('skips a sensitive top event and leads with a lighter one (brand safety)', () => {
    const entry: DayEntry = {
      ...fixture,
      events: [
        { year: 2019, title: 'A mass shooting occurred', desc: '', tag: 'event' },
        { year: 1859, title: 'Big Ben begins keeping time', desc: '', tag: 'event' },
      ],
    };
    const p = historyPin('May', 31, entry);
    expect(p.lines[0]).toContain('Big Ben');
    expect(p.lines[0].toLowerCase()).not.toContain('shooting');
  });

  it('falls back to the lede when every top event is sensitive', () => {
    const entry: DayEntry = {
      ...fixture,
      lede: 'A calmer summary of the day.',
      events: [
        { year: 2019, title: 'A deadly attack', desc: '', tag: 'event' },
        { year: 1944, title: 'A wartime invasion', desc: '', tag: 'event' },
      ],
    };
    const p = historyPin('May', 31, entry);
    expect(p.lines[0]).toContain('calmer summary');
  });

  it('the real May 31 history pin no longer leads with the Virginia Beach shooting', () => {
    const p = historyPin('May', 31, DATES['05-31']);
    expect(p.lines[0].toLowerCase()).not.toContain('shooting');
  });
});

// Guards over the whole baked dataset: no empty pins, no dead destination links.
describe('engine guards over the full dataset', () => {
  const keys = Object.keys(DATES);

  it('has a non-trivial dataset', () => {
    expect(keys.length).toBeGreaterThan(300);
  });

  it('every day yields valid born + history pins with content + attribution', () => {
    for (const key of keys) {
      const [mm, dd] = key.split('-').map(Number);
      const entry = DATES[key];
      const born = bornPin(monthName(mm), mm, dd, entry);
      const hist = historyPin(monthName(mm), dd, entry);
      expect(born.title.length).toBeGreaterThan(0);
      expect(born.lines.every((l) => l.trim().length > 0)).toBe(true);
      expect(hist.lines.every((l) => l.trim().length > 0)).toBe(true);
      expect(hist.attribution).toContain('CC BY-SA');
    }
  });

  it('every pin slug round-trips to a real day key (no dead links)', () => {
    for (const key of keys) {
      expect(fromSlug(toSlug(key))).toBe(key);
    }
  });
});
