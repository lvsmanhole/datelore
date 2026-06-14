// src/lib/video-content.ts
// Loads authored video specs from src/data/video-pins/<MM>/<DD>/*.json and maps each to
// overlay text (for the Satori card) and a posting-queue entry. loadVideoSpecs() uses
// import.meta.glob (build-only, like pin-content.ts); the pure mappers are unit-tested.
import type { VideoPinSpec } from './video-spec';
import { validateVideoPinSpec } from './video-spec';
import { slugFromParts, monthName, dayOfYear } from './slug';
import { SITE_ORIGIN, pinDestination } from './utm';

const FOOT = 'datelore.com';

export interface DayVideoSpec { mm: number; dd: number; spec: VideoPinSpec; }
export interface OverlayText { kicker: string; title: string; lines: string[]; foot: string; attribution?: string; }
export interface VideoQueueEntry {
  day: string; mp4: string; effect: string; cover: string;
  link: string; title: string; description: string; board: string;
}

export function parseDayFromVideoPath(path: string): { mm: number; dd: number } | null {
  const m = path.match(/\/video-pins\/(\d{2})\/(\d{2})\//);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return { mm, dd };
}

export function videoCampaign(kind: string): string {
  return `video-${kind}`;
}

export function videoSpecToOverlayText(spec: VideoPinSpec): OverlayText {
  return { kicker: spec.kicker, title: spec.title, lines: spec.lines, foot: FOOT, attribution: spec.attribution };
}

export function videoSpecToQueueEntry(spec: VideoPinSpec, mm: number, dd: number): VideoQueueEntry {
  const daySlug = slugFromParts(mm, dd);
  const base = spec.description ?? `${spec.lines.join(' · ')} — ${monthName(mm)} ${dd} on DateLore.`;
  const description = spec.hashtags?.length ? `${base} ${spec.hashtags.join(' ')}` : base;
  return {
    day: daySlug,
    mp4: `${daySlug}-${spec.id}.mp4`,
    effect: spec.effect,
    cover: `${SITE_ORIGIN}/pin/${daySlug}-born.png`, // always-present static pin = queue thumbnail
    link: pinDestination(daySlug, videoCampaign(spec.kind)),
    title: spec.title,
    description,
    board: spec.board,
  };
}

export function orderVideoSpecs(items: DayVideoSpec[]): DayVideoSpec[] {
  return [...items].sort(
    (a, b) => dayOfYear(a.mm, a.dd) - dayOfYear(b.mm, b.dd) || a.spec.id.localeCompare(b.spec.id),
  );
}

/** Build-only: load + validate every authored video spec. Skips enabled:false. */
export function loadVideoSpecs(): DayVideoSpec[] {
  const modules = import.meta.glob('../data/video-pins/**/*.json', { eager: true, import: 'default' });
  const out: DayVideoSpec[] = [];
  for (const path in modules) {
    const day = parseDayFromVideoPath(path);
    if (!day) throw new Error(`video spec with unparseable MM/DD path: ${path}`);
    const spec = validateVideoPinSpec(modules[path], path);
    if (spec.enabled === false) continue;
    out.push({ mm: day.mm, dd: day.dd, spec });
  }
  return orderVideoSpecs(out);
}
