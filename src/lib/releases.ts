import type { Release, ReleaseDataset } from '../data/releases-types';
import archive from '../data/releases-archive.json';
import active from '../data/releases-active.json';

// Merge active over archive by id (active wins — it's the fresher window).
export function mergeReleases(dataset: ReleaseDataset): Release[] {
  const byId = new Map<string, Release>();
  for (const rel of dataset.archive) byId.set(rel.id, rel);
  for (const rel of dataset.active) byId.set(rel.id, rel);
  return [...byId.values()];
}

// Deterministic order for stable static builds: popularity desc, then title asc.
export function sortReleases(releases: Release[]): Release[] {
  return [...releases].sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title));
}

// Releases on a specific calendar date (YYYY-MM-DD), sorted.
export function releasesOn(releases: Release[], date: string): Release[] {
  return sortReleases(releases.filter((rel) => rel.date === date));
}

// Releases within a calendar month ('YYYY-MM'), sorted.
export function releasesInMonth(releases: Release[], ym: string): Release[] {
  return sortReleases(releases.filter((rel) => rel.date.startsWith(ym + '-')));
}

export interface YearGroup { year: number; releases: Release[]; }

// Day-page anniversaries: releases whose month-day matches mm/dd across all years,
// grouped by year (newest first). mm and dd are 1-based numbers.
export function releasesForDayPage(releases: Release[], mm: number, dd: number): YearGroup[] {
  const md = `-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const byYear = new Map<number, Release[]>();
  for (const rel of releases) {
    if (rel.date.slice(4) !== md) continue;
    const year = Number(rel.date.slice(0, 4));
    const list = byYear.get(year);
    if (list) list.push(rel);
    else byYear.set(year, [rel]);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, rs]) => ({ year, releases: sortReleases(rs) }));
}

// Next `limit` releases on or after `today` (YYYY-MM-DD), soonest first.
export function upcoming(releases: Release[], today: string, limit: number): Release[] {
  return releases
    .filter((rel) => rel.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || b.popularity - a.popularity)
    .slice(0, limit);
}

// Build-time loader: merge the committed archive + active datasets into one list.
export function loadReleases(): Release[] {
  return mergeReleases({ archive: archive as Release[], active: active as Release[] });
}
