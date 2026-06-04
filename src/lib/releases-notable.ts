import type { Release } from '../data/releases-types';
import { RELEASE_CONFIG, type ReleaseConfig } from './releases-config';

export function isNotable(release: Release, config: ReleaseConfig = RELEASE_CONFIG): boolean {
  return release.popularity >= config.verticals[release.vertical].minPopularity;
}

export function filterNotable(releases: Release[], config: ReleaseConfig = RELEASE_CONFIG): Release[] {
  return releases.filter((r) => isNotable(r, config));
}
