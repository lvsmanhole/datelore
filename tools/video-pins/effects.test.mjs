// tools/video-pins/effects.test.mjs
import { describe, it, expect } from 'vitest';
import { EFFECTS_REGISTRY } from './effects/index.mjs';

const TOTAL = 180; // 6s @ 30fps
const names = Object.keys(EFFECTS_REGISTRY);

describe('effects registry', () => {
  it('registers all eight effects', () => {
    expect(names.sort()).toEqual(['bokeh', 'confetti', 'fireworks', 'hearts', 'leaves', 'lightleak', 'snow', 'starfield']);
  });
});

describe.each(names)('effect: %s', (name) => {
  const { frameSvg, meta } = EFFECTS_REGISTRY[name];
  it('emits a well-formed full-frame SVG at t=0 and mid-clip', () => {
    for (const f of [0, 90]) {
      const svg = frameSvg(f, TOTAL);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.trim().endsWith('</svg>')).toBe(true);
      expect(svg).toContain('width="1000"');
      expect(svg).toContain('height="1500"');
    }
  });
  it('loop effects are seamless: frame[0] === frame[total]', () => {
    if (meta.kind !== 'loop') return;
    expect(frameSvg(0, TOTAL)).toBe(frameSvg(TOTAL, TOTAL));
  });
  it('one-shot effects animate: mid-clip differs from t=0', () => {
    if (meta.kind !== 'oneshot') return;
    expect(frameSvg(90, TOTAL)).not.toBe(frameSvg(0, TOTAL));
  });
});
