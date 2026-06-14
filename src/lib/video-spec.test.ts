import { describe, it, expect } from 'vitest';
import { validateVideoPinSpec, EFFECTS } from './video-spec';

const valid = {
  id: 'fireworks', kind: 'observance', board: 'On This Day in History',
  kicker: 'Fourth Of July', title: 'July 4 in History',
  lines: ['1776 · The Declaration of Independence is adopted'],
  hashtags: ['#FourthOfJuly'], effect: 'fireworks',
};

describe('validateVideoPinSpec', () => {
  it('accepts a well-formed video spec and returns it typed', () => {
    const s = validateVideoPinSpec(valid, 'x.json');
    expect(s.effect).toBe('fireworks');
    expect(s.title).toBe('July 4 in History');
  });
  it('defaults durationSec to undefined (renderer applies 6) and accepts an in-range value', () => {
    expect(validateVideoPinSpec({ ...valid, durationSec: 8 }, 'x.json').durationSec).toBe(8);
  });
  it('rejects an unknown effect', () => {
    expect(() => validateVideoPinSpec({ ...valid, effect: 'lasers' }, 'x.json')).toThrow(/effect/i);
  });
  it('rejects a missing effect', () => {
    const { effect, ...noEffect } = valid;
    expect(() => validateVideoPinSpec(noEffect, 'x.json')).toThrow(/effect/i);
  });
  it('rejects a duration outside 4–15s', () => {
    expect(() => validateVideoPinSpec({ ...valid, durationSec: 2 }, 'x.json')).toThrow(/duration/i);
    expect(() => validateVideoPinSpec({ ...valid, durationSec: 30 }, 'x.json')).toThrow(/duration/i);
  });
  it('still enforces the base PinSpec rules (board allow-list)', () => {
    expect(() => validateVideoPinSpec({ ...valid, board: 'Random' }, 'x.json')).toThrow(/board/i);
  });
  it('exposes the effect allow-list', () => {
    expect(EFFECTS).toEqual(['fireworks', 'bokeh', 'snow', 'hearts', 'confetti', 'leaves', 'starfield', 'lightleak']);
  });
});
