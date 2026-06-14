// src/lib/pins-manifest.test.ts
import { describe, it, expect } from 'vitest';
import { buildPinManifest } from './pins-manifest';
import { ALLOWED_BOARDS } from './pin-spec';
import { fromSlug } from './slug';
import { SITE_ORIGIN } from './utm';
import { SENSITIVE } from './pin-card';

const pins = buildPinManifest();

describe('pin manifest guards (born + history + folder)', () => {
  it('includes the born/history baseline plus folder pins', () => {
    expect(pins.length).toBeGreaterThan(700);
  });
  it('includes the seeded release pins (this assertion is red before wiring)', () => {
    expect(pins.some((p) => p.board === 'Released On This Day')).toBe(true);
  });
  it('every image is same-origin under /pin/', () => {
    for (const p of pins) expect(p.image.startsWith(`${SITE_ORIGIN}/pin/`)).toBe(true);
  });
  it('every board is allow-listed', () => {
    const set = new Set<string>(ALLOWED_BOARDS);
    for (const p of pins) expect(set.has(p.board)).toBe(true);
  });
  it('every destination resolves to a real day slug (no dead links)', () => {
    for (const p of pins) expect(fromSlug(p.day)).not.toBeNull();
  });
  it('no pin title leads with a sensitive phrase', () => {
    for (const p of pins) expect(SENSITIVE.test(p.title)).toBe(false);
  });
  it('every title and description is non-empty', () => {
    for (const p of pins) {
      expect(p.title.trim().length).toBeGreaterThan(0);
      expect(p.description.trim().length).toBeGreaterThan(0);
    }
  });
});
