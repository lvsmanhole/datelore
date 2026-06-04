import { describe, it, expect } from 'vitest';
import { buildAmazonLink } from './releases-affiliate';

describe('buildAmazonLink', () => {
  it('returns undefined when there is no curated ASIN (no generic search fallback)', () => {
    expect(buildAmazonLink({ id: 'movie:tmdb:1' })).toBeUndefined();
  });

  it('builds a direct /dp/ product link when a curated ASIN exists', () => {
    const url = buildAmazonLink(
      { id: 'game:igdb:42' },
      undefined,
      { 'game:igdb:42': 'B0TEST1234' },
    );
    expect(url).toBe('https://www.amazon.com/dp/B0TEST1234?tag=datelore-20');
  });
});
