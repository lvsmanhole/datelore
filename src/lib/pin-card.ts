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

// Events are ranked by notability, and the top entry is often a tragedy or conflict
// (shooting, disaster, war) — brand-damaging on a cheerful share pin and a flag risk
// on Pinterest. This matters MORE now that posting is automated (no human eyeball), so
// the filter is deliberately broad: it checks both the event title AND its entity tag
// (tags carry phrases like "Category 5 Atlantic hurricane" / "global conflict"). Lead
// with the first event that clears the filter; fall back to the day's editorial lede
// when every top event is heavy. (The OG "born" card dodges this by leading with births.)
const SENSITIVE =
  /\b(shoot|shooting|massacr|killing|killed|kills|attack|bombing|bombed|bomb|terror|assassinat|genocide|murder|stabbing|hostage|kidnap|hijack|rape|assault|abuse|suicide|overdose|war|warfare|conflict|battle|invasion|invaded|disaster|earthquake|hurricane|cyclone|typhoon|tsunami|tornado|flood|volcan|eruption|wildfire|fire|crash|sank|sink|sinking|shipwreck|wreck|capsiz|derail|collapse|explos|famine|plague|epidemic|pandemic|outbreak|riot|execution|executed|hanged|lynch|slaughter|drowned|fatal|deadly|casualt|atrocity|dies|died|death|slave|slavery)\b/i;

export interface PinText {
  kind: string;
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
  const ev = entry.events.find((e) => !SENSITIVE.test(e.title) && !SENSITIVE.test(e.tag));
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
