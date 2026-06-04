// Shared types for the release-calendar dataset. Kept in src/data (alongside
// types.ts) so the build-time fetch script and the loader can both import them
// without a cycle.
export type Vertical = 'movie' | 'tv' | 'game' | 'music';

export interface MovieMeta { vertical: 'movie'; certification?: string; runtime?: number; genres?: string[]; }
export interface TvMeta { vertical: 'tv'; network?: string; season?: number; status?: string; }
export interface GameMeta { vertical: 'game'; platforms?: string[]; genres?: string[]; }
export interface MusicMeta { vertical: 'music'; artist?: string; recordType?: 'album' | 'ep' | 'single'; }
export type ReleaseMeta = MovieMeta | TvMeta | GameMeta | MusicMeta;

export interface Release {
  id: string;          // `${vertical}:${source}:${sourceId}` — stable identity for dedupe/merge
  vertical: Vertical;
  title: string;
  date: string;        // ISO YYYY-MM-DD, specific calendar date
  popularity: number;  // normalized 0..100 notability score (drives curation + sort)
  image?: string;      // poster/cover URL
  meta: ReleaseMeta;   // vertical-specific fields
  amazonUrl?: string;  // affiliate link; omitted when none can be built
  sourceUrl: string;   // canonical source URL — required for attribution
}

export interface ReleaseDataset {
  archive: Release[];  // frozen history (Plan C backfill)
  active: Release[];   // nightly-refreshed recent-past + future window
}
