import { describe, it, expect } from 'vitest';
import { boldName, isYearName } from './demote';

describe('boldName', () => {
  it('extracts the bolded name and drops the descriptor', () => {
    expect(boldName('<b>Dieter Laser</b>, German actor')).toBe('Dieter Laser');
  });
  it('decodes &amp; inside a name', () => {
    expect(boldName('<b>Earth, Wind &amp; Fire</b>, American band')).toBe('Earth, Wind & Fire');
  });
  it('falls back to stripped text when there is no bold tag', () => {
    expect(boldName('Some Name, a thing')).toBe('Some Name, a thing');
  });
});

describe('isYearName', () => {
  it('flags bare year placeholders', () => {
    expect(isYearName('AD 404')).toBe(true);
    expect(isYearName('12')).toBe(true);
    expect(isYearName('AD 888')).toBe(true);
  });
  it('does not flag real names', () => {
    expect(isYearName('Grace Hopper')).toBe(false);
    expect(isYearName('Pope Paul III')).toBe(false);
    expect(isYearName('Earth, Wind & Fire')).toBe(false);
  });
});
