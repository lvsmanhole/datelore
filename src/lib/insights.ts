// DateLore-original analysis of a day, COMPUTED from the day's own dataset (and,
// via the caller, from the whole-corpus percentile) — it is our analysis, not
// republished text. Pure + unit-tested. The prose rendering lives in the voice
// layer (insight-voice.ts); this module only produces the structured signals.
import type { DayEntry } from '../data/types';
import { ordinal, monthName } from './slug';
import { roundAnniversaries, type Anniversary } from './anniversaries';

export interface InsightData {
  dateLabel: string; // e.g. "July 4"
  eventCount: number;
  span: { earliest: number; latest: number; years: number } | null;
  dominantEra: string | null; // e.g. "20th century"
  theme: string | null; // a human phrase, e.g. "conflict is a recurring thread"
  birthCount: number;
  historyPercentile: number | null; // 0–100 rarity vs the whole calendar (null if not supplied)
  topAnniversary: Anniversary | null;
}

export interface InsightContext {
  historyPercentile?: number;
  currentYear?: number;
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

export function buildInsightData(
  entry: DayEntry,
  month: number,
  day: number,
  ctx: InsightContext = {},
): InsightData {
  const years = entry.events.map((e) => e.year).filter((y) => Number.isFinite(y));
  const span = years.length
    ? { earliest: Math.min(...years), latest: Math.max(...years), years: Math.max(...years) - Math.min(...years) }
    : null;
  const annivs = ctx.currentYear != null ? roundAnniversaries(entry.events, ctx.currentYear) : [];
  return {
    dateLabel: `${monthName(month)} ${day}`,
    eventCount: entry.events.length,
    span,
    dominantEra: dominantCentury(years),
    theme: detectTheme(entry),
    birthCount: entry.births.length,
    historyPercentile: ctx.historyPercentile ?? null,
    topAnniversary: annivs[0] ?? null,
  };
}
