// src/lib/video-spec.ts
// One authored video pin, stored as src/data/video-pins/<MM>/<DD>/<id>.json. Extends the
// static PinSpec with a procedural motion `effect` + optional clip duration. Validated at
// load time (build for the queue page; render time for the batch) so a bad file fails loud.
import { validatePinSpec, type PinSpec } from './pin-spec';

export const EFFECTS = ['fireworks', 'bokeh', 'snow', 'hearts', 'confetti', 'leaves', 'starfield', 'lightleak'] as const;
export type Effect = (typeof EFFECTS)[number];

export interface VideoPinSpec extends PinSpec {
  effect: Effect;        // which procedural background
  durationSec?: number;  // clip length; default 6 (Pinterest 6–15s recommended)
}

function fail(where: string, msg: string): never {
  throw new Error(`Invalid video pin spec (${where}): ${msg}`);
}

export function validateVideoPinSpec(raw: unknown, where: string): VideoPinSpec {
  const base = validatePinSpec(raw, where); // id/board/kind/lines/hashtags rules, throws on bad
  const s = raw as Record<string, unknown>;
  if (!(EFFECTS as readonly string[]).includes(s.effect as string)) fail(where, `effect must be one of ${EFFECTS.join(' | ')}`);
  if (s.durationSec !== undefined) {
    if (typeof s.durationSec !== 'number' || s.durationSec < 4 || s.durationSec > 15) fail(where, 'durationSec must be a number 4–15');
  }
  return { ...base, effect: s.effect as Effect, durationSec: s.durationSec as number | undefined };
}
