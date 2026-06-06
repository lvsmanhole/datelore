// Pure text derivation for Pinterest pins. No rendering deps live here so it can be
// unit-tested; the Satori/resvg rasterization lives in src/pages/pin/[slug].png.ts.
//
// Two pin kinds per day, targeting different searches and different boards:
//   - "born"    → "Born on May 31?"      (personal/birthday demand)
//   - "history" → "May 31 in History"    (history demand; carries CC BY-SA credit)
//
// Zodiac is shown by NAME, not glyph: the Newsreader brand font has no astrological
// glyphs, so a ♉ would rasterize as tofu. Names ("Taurus") always render.
import type { DayEntry } from '../data/types';
import { teaser } from './og-card';
import { zodiacForDate, birthstoneForMonth } from './reference';

const FOOT = 'datelore.com';

// Events are ranked by notability, and the top entry is often a recent tragedy
// (shooting, disaster, war) — brand-damaging on a cheerful share pin, and a flag
// risk on Pinterest. Skip sensitive titles and lead with the first lighter event;
// fall back to the day's editorial lede when every top event is heavy. (The OG
// "born" card dodges this by leading with births; history pins can't, so they filter.)
const SENSITIVE = /\b(shooting|massacre|killing|killed|attack|bombing|bomb|terror|assassinat|genocide|murder|war|invasion|disaster|earthquake|hurricane|tsunami|crash|wildfire|famine|plague|riot|execution|executed|dies|died|death|hanged|lynch)\b/i;

export interface PinText {
  kind: 'born' | 'history';
  kicker: string; // small uppercase eyebrow
  title: string; // the big serif line
  lines: string[]; // 1–3 supporting lines (always non-empty)
  foot: string; // bottom rule
  attribution?: string; // source credit (history pins — CC BY-SA requirement)
}

/**
 * "Born on <date>?" pin. Leads with zodiac (universal, always present) and a single
 * famous birthday twin when the date has one; birthstone rounds it out. Never empty.
 */
export function bornPin(monthName: string, month: number, day: number, entry: DayEntry): PinText {
  const z = zodiacForDate(month, day);
  const lines: string[] = [`Star sign: ${z.sign}`];
  const twin = entry.births[0];
  if (twin) lines.push(`Shares your birthday: ${twin.name} (${twin.year})`);
  lines.push(`Birthstone: ${birthstoneForMonth(month)}`);
  return { kind: 'born', kicker: 'Born On This Day', title: `Born on ${monthName} ${day}?`, lines, foot: FOOT };
}

/**
 * "<date> in History" pin. Leads with the most notable NON-SENSITIVE event (year +
 * teaser), falling back to the day's editorial lede when every top event is heavy or
 * the date is sparse. Carries Wikimedia attribution because the content is CC BY-SA —
 * a hard licensing requirement.
 */
export function historyPin(monthName: string, day: number, entry: DayEntry): PinText {
  const ev = entry.events.find((e) => !SENSITIVE.test(e.title));
  const lead = ev ? `${ev.year}: ${teaser(ev.title, 92)}` : teaser(entry.lede, 120);
  return {
    kind: 'history',
    kicker: 'On This Day',
    title: `${monthName} ${day} in History`,
    lines: [lead],
    foot: FOOT,
    attribution: 'Source: Wikimedia · CC BY-SA',
  };
}
