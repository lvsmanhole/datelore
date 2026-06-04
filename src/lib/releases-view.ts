import type { Release, Vertical } from '../data/releases-types';
import { RELEASE_CONFIG, type ReleaseConfig } from './releases-config';

const VERTICAL_LABELS: Record<Vertical, string> = { movie: 'Movie', tv: 'TV', game: 'Game', music: 'Music' };
export function verticalLabel(v: Vertical): string {
  return VERTICAL_LABELS[v];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// 'YYYY-MM' strings spanning pastMonths..futureMonths around `today`, oldest first.
export function monthsInWindow(today: string, pastMonths: number, futureMonths: number): string[] {
  const [y, m] = today.split('-').map(Number);
  const base = y * 12 + (m - 1); // months since year 0
  const out: string[] = [];
  for (let offset = -pastMonths; offset <= futureMonths; offset++) {
    const idx = base + offset;
    const yy = Math.floor(idx / 12);
    const mm = (idx % 12) + 1;
    out.push(`${yy}-${String(mm).padStart(2, '0')}`);
  }
  return out;
}

export function configuredMonthWindow(today: string, config: ReleaseConfig = RELEASE_CONFIG): string[] {
  const pastMonths = Math.ceil(config.activePastDays / 30);
  return monthsInWindow(today, pastMonths, config.activeFutureMonths);
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

// Human date like "June 10, 2026" from ISO YYYY-MM-DD (no Date object → no TZ drift).
export function formatReleaseDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

export function groupByVertical(releases: Release[]): Record<Vertical, Release[]> {
  const groups: Record<Vertical, Release[]> = { movie: [], tv: [], game: [], music: [] };
  for (const rel of releases) groups[rel.vertical].push(rel);
  return groups;
}
