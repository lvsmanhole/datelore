import type { Release } from '../data/releases-types';
import { RELEASE_CONFIG, type ReleaseConfig } from './releases-config';

// Curated exact-product overrides for top titles: release id -> Amazon ASIN.
// Exact /dp/ links convert far better than search links; start empty and add
// hand-picked entries for the biggest releases.
export const ASIN_OVERRIDES: Record<string, string> = {};

export function buildAmazonLink(
  release: Pick<Release, 'id' | 'title' | 'vertical'>,
  config: ReleaseConfig = RELEASE_CONFIG,
  overrides: Record<string, string> = ASIN_OVERRIDES,
): string {
  const asin = overrides[release.id];
  if (asin) {
    return `https://${config.amazonDomain}/dp/${asin}?tag=${config.associateTag}`;
  }
  const category = config.verticals[release.vertical].amazonCategory;
  const query = encodeURIComponent(`${release.title} ${category}`);
  return `https://${config.amazonDomain}/s?k=${query}&tag=${config.associateTag}`;
}
