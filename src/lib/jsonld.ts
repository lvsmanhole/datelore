// Pure JSON-LD builders. Each returns a plain object; BaseLayout serializes them
// into <script type="application/ld+json"> tags. Cross-references use @id so the
// separate scripts link into one graph in Google's eyes.
//
// Deliberately NOT emitted: Event schema (Google reserves its Event rich result
// for upcoming, dated events — historical "on this day" entries don't qualify and
// would be a mismatch) and FAQPage (there is no real Q&A content on these pages).

import type { Vertical } from '../data/releases-types';

export const SITE_NAME = 'DateLore';
export const SITE_DESC =
  "What happened on this day in history, the story of the day you were born, and a daily 'which year?' quiz — a warm almanac of every date.";

/** Stable @id anchors so Article/CollectionPage can reference the site + org. */
export const websiteId = (origin: string) => `${origin}/#website`;
export const orgId = (origin: string) => `${origin}/#org`;

export interface Crumb {
  name: string;
  url: string;
}

export function websiteSchema(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(origin),
    name: SITE_NAME,
    url: `${origin}/`,
    description: SITE_DESC,
    inLanguage: 'en',
    publisher: { '@id': orgId(origin) },
  };
}

export function organizationSchema(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': orgId(origin),
    name: SITE_NAME,
    url: `${origin}/`,
    logo: `${origin}/og/logo.png`,
  };
}

/** The site's named human author (see /about). Stable @id so Articles can cite it. */
export const personId = (origin: string) => `${origin}/about/#person`;

export function personSchema(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personId(origin),
    name: 'Roman Tailor',
    description:
      'History enthusiast and creator of DateLore, an almanac of every day of the year.',
    url: `${origin}/about/`,
  };
}

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export interface DayArticleInput {
  origin: string;
  url: string; // canonical URL of the day page
  monthName: string;
  day: number;
  description: string;
  image: string; // absolute OG image URL
  dateModified: string; // ISO timestamp of the last site rebuild (honest freshness signal)
}

/**
 * The day page as an editorial Article. `dateModified` is the build timestamp:
 * the whole static site regenerates on every deploy (data refresh, OG cards, the
 * release window), so it is an honest "last regenerated" signal, not an invented
 * date. We still omit `datePublished` — there is no single authentic publish date.
 * The author is the named human Person (see /about), not the organization.
 */
export function dayArticleSchema(d: DayArticleInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${d.monthName} ${d.day} — On This Day in History`,
    description: d.description,
    image: d.image,
    inLanguage: 'en',
    dateModified: d.dateModified,
    mainEntityOfPage: { '@type': 'WebPage', '@id': d.url },
    isPartOf: { '@id': websiteId(d.origin) },
    publisher: { '@id': orgId(d.origin) },
    author: { '@id': personId(d.origin) },
  };
}

export interface MonthCollectionInput {
  origin: string;
  url: string;
  monthName: string;
  description: string;
  image: string;
  days: { name: string; url: string }[]; // every day page in the month, in order
}

/** A month hub listing every day in that month. */
export function monthCollectionSchema(m: MonthCollectionInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${m.monthName} — Every Day in History`,
    description: m.description,
    url: m.url,
    image: m.image,
    inLanguage: 'en',
    isPartOf: { '@id': websiteId(m.origin) },
    // Enumerate the day pages so AI/search can crawl the set as a list.
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: m.days.map((d, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: d.name,
        url: d.url,
      })),
    },
  };
}

export interface ReleaseListItem {
  vertical: Vertical; // retained so callers pass release data through unchanged; not emitted below
  title: string;
  date: string;   // ISO YYYY-MM-DD
  url?: string;   // canonical source URL
  image?: string;
}

export interface ReleaseListInput {
  url: string;
  name: string;
  items: ReleaseListItem[];
}

/**
 * A release calendar (hub / month) as a plain schema.org ItemList of named entries.
 * Deliberately NOT typed as Movie/VideoGame/TVSeries items: nesting those rich-result
 * types makes Google read the list as a Movie/Game *carousel* and require per-item
 * `image` + `url`, which most third-party releases lack — that produced the "Google
 * rich results validation error". A generic ListItem (name + optional url) is valid
 * and error-free while still describing the list for search + AI engines.
 */
export function releaseListSchema(input: ReleaseListInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: input.name,
    url: input.url,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.title,
      ...(it.url ? { url: it.url } : {}),
    })),
  };
}
