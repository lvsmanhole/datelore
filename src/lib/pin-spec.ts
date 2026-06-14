// src/lib/pin-spec.ts
// One authored Pinterest pin, stored as src/data/pins/<MM>/<DD>/<id>.json. Validated at
// load time so a malformed file fails the build loudly rather than silently dropping a pin.
export type PinSpecKind = 'release' | 'birthday' | 'zodiac' | 'observance' | 'custom';

export const ALLOWED_BOARDS = ['Born On This Day', 'On This Day in History', 'Released On This Day'] as const;
export type Board = (typeof ALLOWED_BOARDS)[number];

const KINDS: PinSpecKind[] = ['release', 'birthday', 'zodiac', 'observance', 'custom'];
// 'born'/'history' are produced by the auto-generated pins and own the /pin/<day>-born.png
// and -history.png slugs; a folder pin must not reuse those ids.
const RESERVED_IDS = ['born', 'history'];

export interface PinSpec {
  id: string;            // unique within the day folder; [a-z0-9-]; drives the image slug suffix
  kind: PinSpecKind;
  board: Board;
  kicker: string;        // small uppercase eyebrow
  title: string;         // big serif headline
  lines: string[];       // 1–3 non-empty supporting lines
  hashtags?: string[];   // appended to the manifest description
  description?: string;  // optional override; default composed from lines + day context
  link?: string;         // site-relative path override; default the day page
  attribution?: string;  // source credit baked into the card
  enabled?: boolean;     // default true; false = skipped entirely
  generated?: boolean;   // true = written by the seeder (guards re-seed clobber)
}

function fail(where: string, msg: string): never {
  throw new Error(`Invalid pin spec (${where}): ${msg}`);
}

export function validatePinSpec(raw: unknown, where: string): PinSpec {
  if (typeof raw !== 'object' || raw === null) fail(where, 'not an object');
  const s = raw as Record<string, unknown>;

  if (typeof s.id !== 'string' || !/^[a-z0-9-]+$/.test(s.id)) fail(where, 'id must match /^[a-z0-9-]+$/');
  if (RESERVED_IDS.includes(s.id as string)) fail(where, `id "${s.id}" is reserved (born/history)`);
  if (!KINDS.includes(s.kind as PinSpecKind)) fail(where, `kind must be one of ${KINDS.join(', ')}`);
  if (!(ALLOWED_BOARDS as readonly string[]).includes(s.board as string)) fail(where, `board must be one of ${ALLOWED_BOARDS.join(' | ')}`);
  if (typeof s.kicker !== 'string' || !s.kicker.trim()) fail(where, 'kicker required');
  if (typeof s.title !== 'string' || !s.title.trim()) fail(where, 'title required');
  if (!Array.isArray(s.lines) || s.lines.length < 1 || s.lines.length > 3) fail(where, 'lines must have 1–3 entries');
  if (!s.lines.every((l) => typeof l === 'string' && l.trim().length > 0)) fail(where, 'every line must be a non-empty string');

  if (s.hashtags !== undefined && !(Array.isArray(s.hashtags) && s.hashtags.every((h) => typeof h === 'string'))) fail(where, 'hashtags must be string[]');
  for (const k of ['description', 'link', 'attribution'] as const) {
    if (s[k] !== undefined && typeof s[k] !== 'string') fail(where, `${k} must be a string`);
  }
  for (const k of ['enabled', 'generated'] as const) {
    if (s[k] !== undefined && typeof s[k] !== 'boolean') fail(where, `${k} must be a boolean`);
  }
  return s as unknown as PinSpec;
}
