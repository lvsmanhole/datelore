// src/lib/pin-content.ts
// Loads authored pin specs from src/data/pins/<MM>/<DD>/*.json and maps each to the
// existing PinText (renderer) and PinManifestEntry (/pins.json). loadPinSpecs() uses
// Vite's import.meta.glob (build-only, like src/data/dates.ts); the pure mappers are
// unit-tested. Type-only import of PinManifestEntry avoids a runtime cycle with pins-manifest.
import type { PinSpec } from './pin-spec';
import { validatePinSpec } from './pin-spec';
import type { PinText } from './pin-card';
import type { PinManifestEntry } from './pins-manifest';
import { slugFromParts, monthName, dayOfYear } from './slug';
import { SITE_ORIGIN, pinDestination, withUtm } from './utm';

const FOOT = 'datelore.com';

export interface DayPinSpec { mm: number; dd: number; spec: PinSpec; }

export function parseDayFromPinPath(path: string): { mm: number; dd: number } | null {
  const m = path.match(/\/pins\/(\d{2})\/(\d{2})\//);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return { mm, dd };
}

export function campaignForKind(kind: string): string {
  return kind === 'release' ? 'released-on-this-day' : `pin-${kind}`;
}

export function pinSpecToText(spec: PinSpec): PinText {
  return { kind: spec.kind, kicker: spec.kicker, title: spec.title, lines: spec.lines, foot: FOOT, attribution: spec.attribution };
}

export function pinSpecToManifest(spec: PinSpec, mm: number, dd: number): PinManifestEntry {
  const daySlug = slugFromParts(mm, dd);
  const campaign = campaignForKind(spec.kind);
  const link = spec.link
    ? withUtm(spec.link, { source: 'pinterest', medium: 'social', campaign, content: daySlug })
    : pinDestination(daySlug, campaign);
  const base = spec.description ?? `${spec.lines.join(' · ')} — ${monthName(mm)} ${dd} on DateLore.`;
  const description = spec.hashtags?.length ? `${base} ${spec.hashtags.join(' ')}` : base;
  return {
    kind: spec.kind,
    day: daySlug,
    image: `${SITE_ORIGIN}/pin/${daySlug}-${spec.id}.png`,
    link,
    title: spec.title,
    description,
    board: spec.board,
  };
}

export function orderPinSpecs(items: DayPinSpec[]): DayPinSpec[] {
  return [...items].sort(
    (a, b) => dayOfYear(a.mm, a.dd) - dayOfYear(b.mm, b.dd) || a.spec.id.localeCompare(b.spec.id),
  );
}

/** Build-only: load + validate every authored pin spec. Skips enabled:false. */
export function loadPinSpecs(): DayPinSpec[] {
  const modules = import.meta.glob('../data/pins/**/*.json', { eager: true, import: 'default' });
  const out: DayPinSpec[] = [];
  for (const path in modules) {
    const day = parseDayFromPinPath(path);
    if (!day) throw new Error(`pin file with unparseable MM/DD path: ${path}`);
    const spec = validatePinSpec(modules[path], path);
    if (spec.enabled === false) continue;
    out.push({ mm: day.mm, dd: day.dd, spec });
  }
  return orderPinSpecs(out);
}
