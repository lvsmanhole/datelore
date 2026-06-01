import { describe, it, expect } from 'vitest';
import { teaser, dayCard, monthCard, siteCard } from './og-card';
import type { DayEntry } from '../data/types';

const entry = (births: { name: string }[]): DayEntry => ({
  lede: 'A long lede about the day that goes on and on and on with lots of words to exceed the cap so the teaser must trim it down to a reasonable shareable length here.',
  events: [{ year: 2019, title: 'Something tragic', desc: 'x', tag: 't' }],
  births: births.map((b, i) => ({ monogram: b.name[0], name: b.name, year: 1900 + i, line: 'l' })),
  deaths: [],
  observances: [],
});

describe('teaser', () => {
  it('strips HTML and collapses whitespace', () => {
    expect(teaser('<b>Hi</b>   there', 50)).toBe('Hi there');
  });
  it('trims long text to a word boundary with an ellipsis', () => {
    const out = teaser('one two three four five six seven eight nine ten', 20);
    expect(out.length).toBeLessThanOrEqual(21); // 20 + ellipsis, minus trimmed word
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('  ');
  });
});

describe('dayCard', () => {
  it('leads with up to three famous birthdays', () => {
    const c = dayCard('May', 31, entry([{ name: 'Clint Eastwood' }, { name: 'Walt Whitman' }, { name: 'Brooke Shields' }, { name: 'Colin Farrell' }]));
    expect(c.title).toBe('May 31');
    expect(c.kicker).toBe('On This Day');
    expect(c.subtitle).toBe('Born today: Clint Eastwood, Walt Whitman, Brooke Shields');
    expect(c.foot).toBe('datelore.com');
  });
  it('falls back to the lede teaser when there are no births', () => {
    const c = dayCard('May', 31, entry([]));
    expect(c.subtitle.startsWith('A long lede')).toBe(true);
    expect(c.subtitle.endsWith('…')).toBe(true);
  });
});

describe('monthCard / siteCard', () => {
  it('month card titles the month', () => {
    expect(monthCard('May').title).toBe('May in History');
  });
  it('site card is the default almanac framing', () => {
    expect(siteCard().title).toBe('On This Day');
  });
});
