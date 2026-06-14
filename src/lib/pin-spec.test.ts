// src/lib/pin-spec.test.ts
import { describe, it, expect } from 'vitest';
import { validatePinSpec, ALLOWED_BOARDS } from './pin-spec';

const valid = {
  id: 'release', kind: 'release', board: 'Released On This Day',
  kicker: 'Released On This Day', title: 'Released on June 13',
  lines: ['2015 · Jurassic World'], hashtags: ['#OnThisDay'],
};

describe('validatePinSpec', () => {
  it('accepts a well-formed spec and returns it typed', () => {
    expect(validatePinSpec(valid, 'x.json').title).toBe('Released on June 13');
  });
  it('rejects a board not in ALLOWED_BOARDS', () => {
    expect(() => validatePinSpec({ ...valid, board: 'Random Board' }, 'x.json')).toThrow(/board/i);
  });
  it('rejects a reserved id that would collide with born/history images', () => {
    expect(() => validatePinSpec({ ...valid, id: 'born' }, 'x.json')).toThrow(/reserved/i);
  });
  it('rejects an id with illegal characters', () => {
    expect(() => validatePinSpec({ ...valid, id: 'My Pin!' }, 'x.json')).toThrow(/id/i);
  });
  it('rejects empty or >3 lines', () => {
    expect(() => validatePinSpec({ ...valid, lines: [] }, 'x.json')).toThrow(/lines/i);
    expect(() => validatePinSpec({ ...valid, lines: ['a', 'b', 'c', 'd'] }, 'x.json')).toThrow(/lines/i);
  });
  it('rejects an unknown kind', () => {
    expect(() => validatePinSpec({ ...valid, kind: 'banner' }, 'x.json')).toThrow(/kind/i);
  });
  it('exposes the three boards', () => {
    expect(ALLOWED_BOARDS).toContain('Born On This Day');
    expect(ALLOWED_BOARDS).toContain('On This Day in History');
    expect(ALLOWED_BOARDS).toContain('Released On This Day');
  });
});
