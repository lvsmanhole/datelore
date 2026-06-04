import type { Release } from '../data/releases-types';
import { RELEASE_CONFIG, type ReleaseConfig } from './releases-config';

// Curated exact-product overrides for top titles: release id -> Amazon ASIN.
// Exact /dp/ links convert far better than search links; start empty and add
// hand-picked entries for the biggest releases.
export const ASIN_OVERRIDES: Record<string, string> = {
  // Curated upcoming-game pre-orders — US Amazon, standard PS5 physical editions,
  // verified 2026-06-04 against the live product pages.
  'game:igdb:168667': 'B0G6157JKW', // Marvel's Wolverine (PS5)
  'game:igdb:347132': 'B0GNT5PJS7', // Marvel Tokon: Fighting Souls (PS5)
  'game:igdb:282831': 'B0GWGTH4LF', // The Blood of Dawnwalker: Day 1 Edition (PS5)
  'game:igdb:325602': 'B0H3RDJ2Q1', // Onimusha: Way of the Sword (PS5)
};

// Returns a direct Amazon product link ONLY when we have a curated ASIN for the
// release — i.e. the actual pre-order/buy product, never a generic search. Returns
// undefined otherwise, so the UI can grey out the button instead of guessing.
export function buildAmazonLink(
  release: Pick<Release, 'id'>,
  config: ReleaseConfig = RELEASE_CONFIG,
  overrides: Record<string, string> = ASIN_OVERRIDES,
): string | undefined {
  const asin = overrides[release.id];
  if (!asin) return undefined;
  return `https://${config.amazonDomain}/dp/${asin}?tag=${config.associateTag}`;
}
