// Pure transform: Wikimedia "On this day" feed -> our DayEntry shape.
// Run at build/fetch time (see scripts/fetch-wikimedia.ts), never in the browser.
// Unit-tested against a captured fixture so it is reproducible and offline.
import { monthName } from './slug';
import type { DayEntry, DayEvent, DayBirth, DayDeath, DayObservance } from '../data/types';

// ---- Raw Wikimedia shapes (only the fields we consume) ----
export interface WmPage { normalizedtitle?: string; description?: string; }
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

// "Walt Whitman, American poet (born 1819)" -> "American poet"
function descriptorFor(it: WmItem, name: string): string {
  let s = clean(it.text);
  if (name && s.toLowerCase().startsWith(name.toLowerCase())) {
    s = s.slice(name.length);
  } else if (s.includes(',')) {
    s = s.slice(s.indexOf(',') + 1);
  } else {
    s = primaryDesc(it);
  }
  s = clean(s).replace(/^[,—\-\s]+/, '');
  // strip a trailing "(born 1819)" / "(1819–2020)" parenthetical
  s = s.replace(/\s*\((?:born\s*)?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\)\s*$/i, '');
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

function evenSpread<T>(arr: T[], k: number): T[] {
  if (k <= 0 || arr.length === 0) return [];
  if (arr.length <= k) return arr.slice();
  const out: T[] = [];
  const step = arr.length / k;
  for (let i = 0; i < k; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

/**
 * Prefer items also present in the curated `selected` set (Wikipedia's
 * editorially-chosen "most notable"), then fill with an even spread across the
 * rest so we don't bias toward the most recent year. Deduped by title, capped.
 */
export function pickNotable(items: WmItem[], selected: Set<string>, n: number): WmItem[] {
  const seen = new Set<string>();
  const keyOf = (it: WmItem) => (primaryTitle(it) || clean(it.text)).toLowerCase();
  const dedupe = (arr: WmItem[]) =>
    arr.filter((it) => {
      const k = keyOf(it);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  const isSelected = (it: WmItem) => {
    const t = primaryTitle(it);
    return t ? selected.has(t) : false;
  };
  const sel = dedupe(items.filter(isSelected));
  if (sel.length >= n) return sel.slice(0, n);
  const rest = dedupe(items.filter((it) => !isSelected(it)));
  return sel.concat(evenSpread(rest, n - sel.length)).slice(0, n);
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
