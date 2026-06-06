import { describe, it, expect } from 'vitest';
import { pinId, forwardDays, selectNextBatch } from './pin-schedule';
import { buildPinManifest, type PinManifestEntry } from './pins-manifest';

function entry(day: string, kind: 'born' | 'history'): PinManifestEntry {
  return { kind, day, image: `x/${day}-${kind}.png`, link: `l/${day}`, title: `${day} ${kind}`, description: 'd', board: 'b' };
}

describe('forwardDays', () => {
  it('is 0 for today and counts forward, wrapping the year', () => {
    expect(forwardDays(5, 31, 'may-31')).toBe(0);
    expect(forwardDays(5, 31, 'june-1')).toBe(1);
    expect(forwardDays(1, 1, 'december-31')).toBe(364); // wraps: ~a full year ahead
  });
});

describe('selectNextBatch', () => {
  const manifest = [
    entry('may-31', 'born'), entry('may-31', 'history'),
    entry('june-10', 'born'), entry('december-25', 'born'),
  ];

  it('excludes already-posted pins and respects quota', () => {
    const out = selectNextBatch({ manifest, posted: ['may-31-born'], todayMonth: 5, todayDay: 31, quota: 2 });
    expect(out.length).toBe(2);
    expect(out.map(pinId)).not.toContain('may-31-born');
  });

  it('prioritizes dates within the lead window, nearest first; far dates last', () => {
    const out = selectNextBatch({ manifest, posted: [], todayMonth: 5, todayDay: 31, quota: 4, leadDays: 14 });
    expect(pinId(out[0])).toMatch(/^may-31-/); // d=0
    expect(pinId(out[out.length - 1])).toBe('december-25-born'); // far out of window
  });

  it('is deterministic across runs', () => {
    const a = selectNextBatch({ manifest, posted: [], todayMonth: 5, todayDay: 31, quota: 4 });
    const b = selectNextBatch({ manifest, posted: [], todayMonth: 5, todayDay: 31, quota: 4 });
    expect(a.map(pinId)).toEqual(b.map(pinId));
  });

  it('returns nothing when quota is 0 or everything is posted', () => {
    expect(selectNextBatch({ manifest, posted: [], todayMonth: 5, todayDay: 31, quota: 0 })).toEqual([]);
    const allIds = manifest.map(pinId);
    expect(selectNextBatch({ manifest, posted: allIds, todayMonth: 5, todayDay: 31, quota: 5 })).toEqual([]);
  });
});

describe('integration with the real manifest', () => {
  it('returns quota fresh pins, none previously posted', () => {
    const manifest = buildPinManifest();
    const posted = new Set([pinId(manifest[0]), pinId(manifest[1])]);
    const out = selectNextBatch({ manifest, posted, todayMonth: 6, todayDay: 6, quota: 8 });
    expect(out.length).toBe(8);
    for (const p of out) expect(posted.has(pinId(p))).toBe(false);
  });
});
