// src/lib/pin-content.test.ts
import { describe, it, expect } from 'vitest';
import { parseDayFromPinPath, campaignForKind, pinSpecToText, pinSpecToManifest, orderPinSpecs } from './pin-content';
import { SITE_ORIGIN } from './utm';
import type { PinSpec } from './pin-spec';

const spec: PinSpec = {
  id: 'release', kind: 'release', board: 'Released On This Day',
  kicker: 'Released On This Day', title: 'Released on June 13',
  lines: ['2015 · Jurassic World', '2017 · Get Out'], hashtags: ['#OnThisDay'],
};

describe('parseDayFromPinPath', () => {
  it('extracts mm/dd from a pin file path', () => {
    expect(parseDayFromPinPath('../data/pins/06/13/release.json')).toEqual({ mm: 6, dd: 13 });
  });
  it('returns null for a path without a valid MM/DD segment', () => {
    expect(parseDayFromPinPath('../data/pins/release.json')).toBeNull();
  });
});

describe('campaignForKind', () => {
  it('maps release to released-on-this-day', () => {
    expect(campaignForKind('release')).toBe('released-on-this-day');
  });
  it('namespaces other kinds', () => {
    expect(campaignForKind('zodiac')).toBe('pin-zodiac');
  });
});

describe('pinSpecToText', () => {
  it('maps a spec to PinText with the brand foot', () => {
    const t = pinSpecToText(spec);
    expect(t.title).toBe('Released on June 13');
    expect(t.lines).toHaveLength(2);
    expect(t.foot).toBe('datelore.com');
  });
});

describe('pinSpecToManifest', () => {
  const m = pinSpecToManifest(spec, 6, 13);
  it('builds a same-origin image slug from day + id', () => {
    expect(m.image).toBe(`${SITE_ORIGIN}/pin/june-13-release.png`);
  });
  it('uses the kind campaign in the UTM link', () => {
    expect(m.link).toContain('utm_campaign=released-on-this-day');
    expect(m.link).toContain('/june-13/');
  });
  it('appends hashtags to the composed description', () => {
    expect(m.description).toContain('Jurassic World');
    expect(m.description.trim().endsWith('#OnThisDay')).toBe(true);
  });
  it('honors a description override', () => {
    expect(pinSpecToManifest({ ...spec, description: 'Custom copy.' }, 6, 13).description).toContain('Custom copy.');
  });
});

describe('orderPinSpecs', () => {
  it('sorts by calendar date then id', () => {
    const a = { mm: 6, dd: 13, spec: { ...spec, id: 'b' } };
    const b = { mm: 1, dd: 2, spec: { ...spec, id: 'a' } };
    const c = { mm: 6, dd: 13, spec: { ...spec, id: 'a' } };
    expect(orderPinSpecs([a, b, c]).map((x) => x.spec.id)).toEqual(['a', 'a', 'b']);
  });
});
