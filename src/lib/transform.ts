// Pure transform: Wikimedia "On this day" feed -> our DayEntry shape.
// Run at build/fetch time (see scripts/fetch-wikimedia.ts), never in the browser.
// Unit-tested against a captured fixture so it is reproducible and offline.
import { monthName } from './slug';
import type { DayEntry, DayEvent, DayBirth, DayDeath, DayObservance } from '../data/types';

// ---- Raw Wikimedia shapes (only the fields we consume) ----
export interface WmPage { normalizedtitle?: string; description?: string; wikibase_item?: string; }
export interface WmItem { year?: number; text: string; pages?: WmPage[]; }
export interface WmFeed {
  events?: WmItem[];
  births?: WmItem[];
  deaths?: WmItem[];
  holidays?: WmItem[];
  selected?: WmItem[];
}

/** Escape HTML-significant characters in text that will be rendered via set:html. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clean(s: string | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}
function firstWords(s: string, n: number): string {
  return clean(s).split(' ').slice(0, n).join(' ');
}
function primaryTitle(it: WmItem): string {
  return clean(it.pages?.[0]?.normalizedtitle);
}
function primaryDesc(it: WmItem): string {
  return clean(it.pages?.[0]?.description);
}

// strip "(born 1819)", "(died 1939)", "(1819–2020)" wherever they appear
function stripDateParens(s: string): string {
  return clean(s.replace(/\s*\((?:born|died)?\s*\d{1,4}(?:\s*[–-]\s*\d{1,4})?\)\s*/gi, ' '));
}

// "Walt Whitman, American poet (born 1819)" -> "American poet"
function descriptorFor(it: WmItem, name: string): string {
  let s = clean(it.text);
  if (name && s.toLowerCase().startsWith(name.toLowerCase())) {
    s = s.slice(name.length);
  } else if (s.includes(',')) {
    s = s.slice(s.indexOf(',') + 1);
  } else {
    s = '';
  }
  s = stripDateParens(clean(s).replace(/^[,—\-\s]+/, ''));
  if (s.length < 3) s = stripDateParens(primaryDesc(it)); // fall back to the Wikidata description
  return clean(s);
}

function selectedTitles(feed: WmFeed): Set<string> {
  const set = new Set<string>();
  for (const it of feed.selected ?? []) {
    const t = primaryTitle(it);
    if (t) set.add(t);
  }
  return set;
}

// Wikidata Q-number as a free notability proxy: items are numbered in creation
// order, so long-established, iconic subjects have LOW Q-numbers while obscure
// recent entries (e.g. a just-debuted athlete) have very high ones. Sorting by
// Q ascending floats famous historical figures to the top far better than the
// feed's default reverse-chronological order. Missing/odd ids sort last.
function notabilityRank(it: WmItem): number {
  const q = it.pages?.[0]?.wikibase_item;
  if (!q) return Number.MAX_SAFE_INTEGER;
  const n = parseInt(q.replace(/^Q/i, ''), 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/**
 * Rank items by notability and take the top n. Items in Wikipedia's curated
 * `selected` set rank first; the rest are ordered by the Wikidata-Q notability
 * proxy (low Q = more notable). Deduped by title.
 */
export function pickNotable(items: WmItem[], selected: Set<string>, n: number): WmItem[] {
  const seen = new Set<string>();
  const keyOf = (it: WmItem) => (primaryTitle(it) || clean(it.text)).toLowerCase();
  const isSelected = (it: WmItem) => {
    const t = primaryTitle(it);
    return t ? selected.has(t) : false;
  };
  const deduped = items.filter((it) => {
    const k = keyOf(it);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  deduped.sort((a, b) => {
    const sa = isSelected(a) ? 0 : 1;
    const sb = isSelected(b) ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return notabilityRank(a) - notabilityRank(b);
  });
  return deduped.slice(0, n);
}

function tagFor(it: WmItem): string {
  const d = primaryDesc(it);
  if (!d) return 'History';
  const short = firstWords(d, 4);
  return short.charAt(0).toUpperCase() + short.slice(1);
}
function toEvent(it: WmItem): DayEvent {
  return {
    year: it.year as number,
    title: primaryTitle(it) || firstWords(it.text, 6),
    desc: escapeHtml(clean(it.text)),
    tag: tagFor(it),
  };
}
function toBirth(it: WmItem): DayBirth {
  const name = primaryTitle(it) || firstWords(it.text, 3);
  return {
    monogram: (name.charAt(0) || '?').toUpperCase(),
    name,
    year: it.year as number,
    line: escapeHtml(descriptorFor(it, name)),
  };
}
function toDeath(it: WmItem): DayDeath {
  const name = primaryTitle(it) || firstWords(it.text, 3);
  const desc = descriptorFor(it, name);
  return {
    year: it.year as number,
    text: desc ? `<b>${escapeHtml(name)}</b>, ${escapeHtml(desc)}` : `<b>${escapeHtml(name)}</b>`,
  };
}
function toObservance(it: WmItem): DayObservance {
  return { text: `<b>${escapeHtml(clean(it.text))}</b>` };
}

function buildLede(month: number, day: number, births: DayBirth[]): string {
  const mn = monthName(month);
  const names = births.slice(0, 2).map((b) => b.name).filter(Boolean);
  const who = names.length
    ? ` famous birthdays including ${names.join(' and ')},`
    : ' notable birthdays,';
  return `A look at ${mn} ${day} through the almanac — historic events,${who} and the day's notable deaths and observances.`;
}

/** Transform a raw Wikimedia feed for (month, day) into our DayEntry. */
export function transformDay(feed: WmFeed, month: number, day: number): DayEntry {
  const selected = selectedTitles(feed);

  const events = pickNotable(feed.events ?? [], selected, 10)
    .filter((e) => typeof e.year === 'number')
    .map(toEvent)
    .sort((a, b) => b.year - a.year);

  const births = pickNotable(feed.births ?? [], selected, 8)
    .filter((b) => typeof b.year === 'number')
    .map(toBirth);

  const deaths = pickNotable(feed.deaths ?? [], selected, 6)
    .filter((d) => typeof d.year === 'number')
    .map(toDeath)
    .sort((a, b) => b.year - a.year);

  const observances = (feed.holidays ?? [])
    .slice(0, 8)
    .map(toObservance)
    .filter((o) => o.text.length > 7); // drop empty "<b></b>"

  return { lede: buildLede(month, day, births), events, births, deaths, observances };
}
