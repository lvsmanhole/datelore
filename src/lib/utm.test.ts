import { describe, it, expect } from 'vitest';
import { withUtm, pinDestination, SITE_ORIGIN } from './utm';

describe('withUtm', () => {
  it('appends utm params after the trailing slash and returns an absolute URL', () => {
    const url = withUtm('/may-31/', { source: 'pinterest', medium: 'social', campaign: 'born-on', content: 'may-31' });
    expect(url).toBe('https://datelore.com/may-31/?utm_source=pinterest&utm_medium=social&utm_campaign=born-on&utm_content=may-31');
  });

  it('omits utm_content when not provided', () => {
    const url = withUtm('/quiz/', { source: 'pinterest', medium: 'social', campaign: 'quiz' });
    expect(url).toContain('utm_campaign=quiz');
    expect(url).not.toContain('utm_content');
  });

  it('throws on a path missing its leading slash (fail loud, never mislabel traffic)', () => {
    expect(() => withUtm('may-31/', { source: 's', medium: 'm', campaign: 'c' })).toThrow();
  });
});

describe('pinDestination', () => {
  it('tags the day page by pin kind', () => {
    expect(pinDestination('may-31', 'born')).toBe(
      `${SITE_ORIGIN}/may-31/?utm_source=pinterest&utm_medium=social&utm_campaign=born-on&utm_content=may-31`,
    );
    expect(pinDestination('may-31', 'history')).toContain('utm_campaign=on-this-day');
  });
});
