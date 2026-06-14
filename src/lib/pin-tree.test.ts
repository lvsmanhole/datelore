// src/lib/pin-tree.test.ts
import { describe, it, expect } from 'vitest';
import { pinTree } from './pin-tree';
import { renderPng } from './og-brand';
import { pinSpecToText } from './pin-content';
import type { PinSpec } from './pin-spec';

const spec: PinSpec = {
  id: 'release', kind: 'release', board: 'Released On This Day',
  kicker: 'Released On This Day', title: 'Released on June 13',
  lines: ['2015 · Jurassic World'], attribution: 'Sources: TMDB · IGDB · MusicBrainz',
};

describe('pinTree rendering', () => {
  it('renders a folder pin to a valid PNG buffer', async () => {
    const png = await renderPng(pinTree(pinSpecToText(spec)), 1000, 1500);
    expect(png.subarray(0, 4).toString('hex')).toBe('89504e47'); // PNG magic
    expect(png.length).toBeGreaterThan(1000);
  });
});
