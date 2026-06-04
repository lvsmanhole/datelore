import type { Vertical } from '../data/releases-types';

export interface VerticalConfig {
  minPopularity: number;   // notability threshold, 0..100
  amazonCategory: string;  // appended to the Amazon search query for relevance
}

export interface ReleaseConfig {
  associateTag: string;     // Amazon Associates tracking tag
  amazonDomain: string;     // e.g. 'www.amazon.com'
  archiveYears: number;     // history backfill depth (5 for MVP, 10 in Phase 2)
  activePastDays: number;   // active-window lookback
  activeFutureMonths: number; // active-window lookahead
  verticals: Record<Vertical, VerticalConfig>;
}

// Thresholds are intentionally simple and live in ONE place so signal/noise can be
// dialed after launch without code changes. They need calibration against live API
// popularity distributions during Plan C.
export const RELEASE_CONFIG: ReleaseConfig = {
  associateTag: 'datelore-20',
  amazonDomain: 'www.amazon.com',
  archiveYears: 5,
  activePastDays: 60,
  activeFutureMonths: 18,
  verticals: {
    movie: { minPopularity: 20, amazonCategory: 'movie' },
    tv:    { minPopularity: 20, amazonCategory: 'tv series' },
    game:  { minPopularity: 20, amazonCategory: 'video game' },
    music: { minPopularity: 20, amazonCategory: 'album' },
  },
};
