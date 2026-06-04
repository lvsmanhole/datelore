import { describe, it, expect } from 'vitest';
import { buildAmazonLink } from './releases-affiliate';

describe('buildAmazonLink', () => {
  it('builds a tagged search link when there is no ASIN override', () => {
    const url = buildAmazonLink({ id: 'movie:tmdb:1', title: 'Dune Part Two', vertical: 'movie' });
    expect(url).toBe('https://www.amazon.com/s?k=Dune%20Part%20Two%20movie&tag=datelore-20');
  });

  it('builds a direct /dp/ product link when an ASIN override exists', () => {
    const url = buildAmazonLink(
      { id: 'game:igdb:42', title: 'Whatever', vertical: 'game' },
      undefined,
      { 'game:igdb:42': 'B0TEST1234' },
    );
    expect(url).toBe('https://www.amazon.com/dp/B0TEST1234?tag=datelore-20');
  });

  it('uses the per-vertical category in the search query', () => {
    const url = buildAmazonLink({ id: 'music:mb:7', title: 'Album', vertical: 'music' });
    expect(url).toContain('Album%20album');
  });
});
