// Pure text derivation for the OG/share cards. No rendering deps live here so it
// can be unit-tested; the Satori/resvg rasterization lives in the endpoint.
import type { DayEntry } from '../data/types';

export interface CardText {
  kicker: string; // small uppercase eyebrow
  title: string; // the big serif line
  subtitle: string; // one supporting line
  foot: string; // bottom rule
}

const FOOT = 'datelore.com';

/** Strip any HTML and collapse whitespace, then trim to <= max chars on a word boundary. */
export function teaser(text: string, max = 116): string {
  const clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max).trimEnd()}…`;
}

/**
 * Day card. Leads with famous birthdays (celebratory + share-friendly) rather
 * than the events list, whose top entries are ranked by notability and can be
 * recent tragedies — a poor fit for a "Born on <date>?" share card. Falls back
 * to the lede when a date has no births.
 */
export function dayCard(monthName: string, day: number, entry: DayEntry): CardText {
  const names = entry.births.slice(0, 3).map((b) => b.name);
  const subtitle = names.length
    ? `Born today: ${names.join(', ')}`
    : teaser(entry.lede);
  return {
    kicker: 'On This Day',
    title: `${monthName} ${day}`,
    subtitle,
    foot: FOOT,
  };
}

export function monthCard(monthName: string): CardText {
  return {
    kicker: 'The Almanac',
    title: `${monthName} in History`,
    subtitle: `Every day in ${monthName} — events, famous birthdays, and the stories behind the date.`,
    foot: FOOT,
  };
}

export function siteCard(): CardText {
  return {
    kicker: 'The Almanac',
    title: 'On This Day',
    subtitle: 'History, famous birthdays, and a daily quiz — for every day of the year.',
    foot: FOOT,
  };
}
