import { describe, it, expect } from 'vitest';
import { transformDay, escapeHtml, pickNotable, type WmItem, type WmFeed } from './transform';
import fixture from './__fixtures__/onthisday-05-31.json';

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml('Harland & Wolff <co> "x"')).toBe(
      'Harland &amp; Wolff &lt;co&gt; &quot;x&quot;',
    );
  });
});

describe('pickNotable', () => {
  const items: WmItem[] = [
    { year: 2001, text: 'A', pages: [{ normalizedtitle: 'A' }] },
    { year: 1900, text: 'B', pages: [{ normalizedtitle: 'B' }] },
    { year: 1950, text: 'C', pages: [{ normalizedtitle: 'C' }] },
  ];
  it('prefers selected items first, then fills, capped', () => {
    const picked = pickNotable(items, new Set(['B']), 2);
    expect(picked).toHaveLength(2);
    expect(picked[0].pages![0].normalizedtitle).toBe('B');
  });
  it('never exceeds n and dedupes by title', () => {
    const dup = [...items, { year: 1999, text: 'A', pages: [{ normalizedtitle: 'A' }] }];
    expect(pickNotable(dup, new Set(), 10)).toHaveLength(3);
  });
  it('ranks by Wikidata-Q notability (low Q = more notable, beats recency)', () => {
    const byQ: WmItem[] = [
      { year: 2005, text: 'Obscure', pages: [{ normalizedtitle: 'Obscure', wikibase_item: 'Q90000000' }] },
      { year: 1900, text: 'Iconic', pages: [{ normalizedtitle: 'Iconic', wikibase_item: 'Q1234' }] },
    ];
    const picked = pickNotable(byQ, new Set(), 2);
    expect(picked[0].pages![0].normalizedtitle).toBe('Iconic'); // low Q wins despite being listed second
  });
});

describe('transformDay (against a real trimmed fixture)', () => {
  const feed = fixture as unknown as WmFeed;
  const entry = transformDay(feed, 5, 31);

  it('builds a DayEntry with all sections populated', () => {
    expect(entry.events.length).toBeGreaterThan(0);
    expect(entry.births.length).toBeGreaterThan(0);
    expect(entry.deaths.length).toBeGreaterThan(0);
    expect(entry.observances.length).toBeGreaterThan(0);
  });

  it('sorts events newest-first with all required fields', () => {
    for (let i = 1; i < entry.events.length; i++) {
      expect(entry.events[i - 1].year).toBeGreaterThanOrEqual(entry.events[i].year);
    }
    for (const e of entry.events) {
      expect(typeof e.year).toBe('number');
      expect(e.title).toBeTruthy();
      expect(e.desc).toBeTruthy();
      expect(e.tag).toBeTruthy();
    }
  });

  it('formats births with a monogram and a clean descriptor line', () => {
    for (const b of entry.births) {
      expect(b.name).toBeTruthy();
      expect(b.monogram).toBe(b.name.charAt(0).toUpperCase());
      expect(b.line).not.toMatch(/\(born/i); // born-year parenthetical stripped
    }
  });

  it('wraps death and observance names in <b>', () => {
    expect(entry.deaths[0].text).toContain('<b>');
    expect(entry.observances[0].text).toContain('<b>');
  });

  it('generates a date-specific lede', () => {
    expect(entry.lede).toContain('May 31');
  });

  it('is deterministic', () => {
    expect(transformDay(feed, 5, 31)).toEqual(transformDay(feed, 5, 31));
  });
});
