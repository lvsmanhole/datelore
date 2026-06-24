// Helpers for the /zodiac/<sign>/ hub pages. Pure; reuses zodiacForDate so the
// "which dates fall under this sign" logic has exactly one source of truth.
import { zodiacForDate } from './reference';

export function signSlug(sign: string): string {
  return sign.toLowerCase();
}

/** The MM-DD keys (from `keys`) whose date falls under `sign`, in input order. */
export function daysUnderSign(sign: string, keys: string[]): string[] {
  return keys.filter((k) => {
    const [mm, dd] = k.split('-').map(Number);
    return zodiacForDate(mm, dd).sign === sign;
  });
}
