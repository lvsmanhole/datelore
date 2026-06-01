// DateLore-original "by the numbers" synthesis for a day page. Everything here is
// COMPUTED from the day's own dataset — it is our analysis, not republished text —
// so it adds genuine value (and avoids "scaled content") at zero marginal effort
// per date. Pure + unit-tested.
import type { DayEntry } from '../data/types';
import { ordinal, monthName } from './slug';

export interface DayInsights {
  eventCount: number;
  span: { earliest: number; latest: number; years: number } | null;
  dominantEra: string | null; // e.g. "20th century"
  theme: string | null; // a human phrase, e.g. "conflict is a recurring thread"
  birthCount: number;
  birthSpan: { earliest: number; latest: number } | null;
  sentence: string; // the assembled original synthesis
}

// Soft theme detection: each event counts once toward a theme if any keyword hits
// its title/tag/description. The most-matched theme (>= 2 events) wins.
const THEMES: { phrase: string; words: string[] }[] = [
  { phrase: 'conflict is a recurring thread', words: ['war', 'battle', 'siege', 'invasion', 'revolt', 'rebellion', 'military', 'army', 'troops', 'bombing', 'shooting', 'massacre', 'conflict'] },
  { phrase: 'disaster looms large', words: ['earthquake', 'flood', 'wildfire', 'tornado', 'hurricane', 'cyclone', 'eruption', 'volcano', 'disaster', 'crash', 'sinking', 'sank', 'famine', 'plague', 'epidemic'] },
  { phrase: 'science and discovery feature prominently', words: ['discover', 'invent', 'physic', 'chemist', 'spacecraft', 'satellite', 'orbit', 'telescope', 'experiment', 'vaccine', 'patent', 'astronom'] },
  { phrase: 'politics and nation-building recur', words: ['independence', 'treaty', 'constitution', 'founded', 'election', 'republic', 'declaration', 'crowned', 'parliament', 'president', 'kingdom', 'signed'] },
  { phrase: 'culture and the arts appear', words: ['film', 'movie', 'opera', 'album', 'novel', 'published', 'premiere', 'painting', 'symphony', 'broadcast'] },
];

function dominantCentury(years: number[]): string | null {
  if (years.length < 2) return null;
  const counts = new Map<number, number>();
  for (const y of years) {
    const c = Math.floor((y - 1) / 100) + 1;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = 0;
  for (const [c, n] of counts) {
    if (n > bestCount) {
      bestCount = n;
      best = c;
    }
  }
  return bestCount >= 2 ? `${ordinal(best)} century` : null;
}

function detectTheme(entry: DayEntry): string | null {
  const blobs = entry.events.map((e) => `${e.title} ${e.tag} ${e.desc}`.toLowerCase());
  let winner: { phrase: string; count: number } | null = null;
  for (const t of THEMES) {
    let count = 0;
    for (const blob of blobs) if (t.words.some((w) => blob.includes(w))) count++;
    if (count >= 2 && (!winner || count > winner.count)) winner = { phrase: t.phrase, count };
  }
  return winner ? winner.phrase : null;
}

function buildSentence(i: Omit<DayInsights, 'sentence'>, dateLabel: string): string {
  const parts: string[] = [];

  if (i.eventCount === 1 && i.span) {
    parts.push(`${dateLabel} has a single recorded event, from ${i.span.earliest}.`);
  } else if (i.eventCount > 1 && i.span && i.span.years > 0) {
    parts.push(
      `Across ${i.eventCount} recorded events, ${dateLabel} spans ${i.span.years.toLocaleString('en-US')} years — from ${i.span.earliest} to ${i.span.latest}.`,
    );
  } else if (i.eventCount > 0) {
    parts.push(`${dateLabel} gathers ${i.eventCount} recorded events.`);
  }

  if (i.dominantEra && i.theme) parts.push(`The ${i.dominantEra} leaves the deepest mark, and ${i.theme}.`);
  else if (i.dominantEra) parts.push(`The ${i.dominantEra} leaves the deepest mark.`);
  else if (i.theme) parts.push(`Here, ${i.theme}.`);

  if (i.birthCount === 1 && i.birthSpan) {
    parts.push(`One notable figure shares the date, born in ${i.birthSpan.earliest}.`);
  } else if (i.birthCount > 1 && i.birthSpan && i.birthSpan.earliest !== i.birthSpan.latest) {
    parts.push(`${i.birthCount} notable figures share the date, born between ${i.birthSpan.earliest} and ${i.birthSpan.latest}.`);
  } else if (i.birthCount > 1) {
    parts.push(`${i.birthCount} notable figures share the date.`);
  }

  return parts.join(' ');
}

export function dayInsights(entry: DayEntry, month: number, day: number): DayInsights {
  const years = entry.events.map((e) => e.year).filter((y) => Number.isFinite(y));
  const span = years.length
    ? { earliest: Math.min(...years), latest: Math.max(...years), years: Math.max(...years) - Math.min(...years) }
    : null;
  const birthYears = entry.births.map((b) => b.year).filter((y) => Number.isFinite(y));
  const birthSpan = birthYears.length ? { earliest: Math.min(...birthYears), latest: Math.max(...birthYears) } : null;

  const base = {
    eventCount: entry.events.length,
    span,
    dominantEra: dominantCentury(years),
    theme: detectTheme(entry),
    birthCount: entry.births.length,
    birthSpan,
  };
  return { ...base, sentence: buildSentence(base, `${monthName(month)} ${day}`) };
}
