import { describe, it, expect } from 'vitest';
import {
  websiteSchema,
  organizationSchema,
  breadcrumbSchema,
  dayArticleSchema,
  monthCollectionSchema,
  releaseListSchema,
  websiteId,
  orgId,
  personId,
  personSchema,
} from './jsonld';

const ORIGIN = 'https://datelore.com';

describe('websiteSchema', () => {
  const s = websiteSchema(ORIGIN);
  it('is a WebSite with a stable @id and trailing-slash url', () => {
    expect(s['@type']).toBe('WebSite');
    expect(s['@id']).toBe(websiteId(ORIGIN));
    expect(s.url).toBe('https://datelore.com/');
  });
  it('points its publisher at the organization @id', () => {
    expect(s.publisher).toEqual({ '@id': orgId(ORIGIN) });
  });
});

describe('organizationSchema', () => {
  const s = organizationSchema(ORIGIN);
  it('is an Organization with a logo image url', () => {
    expect(s['@type']).toBe('Organization');
    expect(s['@id']).toBe(orgId(ORIGIN));
    expect(s.logo).toBe('https://datelore.com/og/logo.png');
  });
});

describe('breadcrumbSchema', () => {
  it('numbers list items from 1 and carries name + url', () => {
    const s = breadcrumbSchema([
      { name: 'DateLore', url: `${ORIGIN}/` },
      { name: 'May', url: `${ORIGIN}/may` },
      { name: 'May 31', url: `${ORIGIN}/may-31` },
    ]);
    expect(s['@type']).toBe('BreadcrumbList');
    expect(s.itemListElement).toHaveLength(3);
    expect(s.itemListElement[0]).toMatchObject({ position: 1, name: 'DateLore' });
    expect(s.itemListElement[2]).toMatchObject({ position: 3, name: 'May 31', item: `${ORIGIN}/may-31` });
  });
});

describe('dayArticleSchema', () => {
  const s = dayArticleSchema({
    origin: ORIGIN,
    url: `${ORIGIN}/may-31`,
    monthName: 'May',
    day: 31,
    description: 'What happened on May 31.',
    image: `${ORIGIN}/og/may-31.png`,
    dateModified: '2026-06-22T08:00:00.000Z',
  });
  it('builds an Article headline from the date and carries the image', () => {
    expect(s['@type']).toBe('Article');
    expect(s.headline).toBe('May 31 — On This Day in History');
    expect(s.image).toBe(`${ORIGIN}/og/may-31.png`);
    expect(s.mainEntityOfPage).toEqual({ '@type': 'WebPage', '@id': `${ORIGIN}/may-31` });
  });
  it('omits datePublished but carries an honest build-time dateModified', () => {
    expect(s).not.toHaveProperty('datePublished');
    expect(s.dateModified).toBe('2026-06-22T08:00:00.000Z');
  });
  it('links publisher to the org and author to the named Person', () => {
    expect(s.publisher).toEqual({ '@id': orgId(ORIGIN) });
    expect(s.author).toEqual({ '@id': personId(ORIGIN) });
  });
});

describe('personSchema', () => {
  const s = personSchema(ORIGIN);
  it('is a Person with the stable about-page @id', () => {
    expect(s['@type']).toBe('Person');
    expect(s['@id']).toBe(personId(ORIGIN));
    expect(s['@id']).toBe('https://datelore.com/about/#person');
    expect(s.name).toBe('Roman Tailor');
    expect(s.url).toBe('https://datelore.com/about/');
  });
});

describe('monthCollectionSchema', () => {
  it('is a CollectionPage tied to the website', () => {
    const s = monthCollectionSchema({
      origin: ORIGIN,
      url: `${ORIGIN}/may`,
      monthName: 'May',
      description: 'Every day in May.',
      image: `${ORIGIN}/og/may.png`,
      days: [
        { name: 'May 1', url: `${ORIGIN}/may-1` },
        { name: 'May 2', url: `${ORIGIN}/may-2` },
      ],
    });
    expect(s['@type']).toBe('CollectionPage');
    expect(s.name).toBe('May — Every Day in History');
    expect(s.isPartOf).toEqual({ '@id': websiteId(ORIGIN) });
    expect(s.mainEntity.itemListElement).toHaveLength(2);
    expect(s.mainEntity.itemListElement[0]).toMatchObject({ position: 1, name: 'May 1', url: `${ORIGIN}/may-1` });
  });
});

describe('releaseListSchema', () => {
  it('is a plain ItemList of named ListItems (no rich-result media types)', () => {
    const s = releaseListSchema({
      url: 'https://datelore.com/releases/2026-06',
      name: 'Releases in June 2026',
      items: [
        { vertical: 'movie', title: 'A Big Film', date: '2026-06-10', url: 'https://example.test/film', image: 'https://example.test/film.jpg' },
        { vertical: 'game', title: 'A Big Game', date: '2026-06-20' },
      ],
    });
    expect(s['@type']).toBe('ItemList');
    expect(s.numberOfItems).toBe(2);
    expect(s.itemListElement).toHaveLength(2);
    expect(s.itemListElement[0]).toMatchObject({
      '@type': 'ListItem', position: 1, name: 'A Big Film', url: 'https://example.test/film',
    });
    // No nested Movie/VideoGame item — that triggered Google's carousel validation.
    expect(s.itemListElement[0]).not.toHaveProperty('item');
    // url is omitted when the release has no source URL.
    expect(s.itemListElement[1]).toMatchObject({ position: 2, name: 'A Big Game' });
    expect(s.itemListElement[1]).not.toHaveProperty('url');
  });
});
