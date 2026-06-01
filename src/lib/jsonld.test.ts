import { describe, it, expect } from 'vitest';
import {
  websiteSchema,
  organizationSchema,
  breadcrumbSchema,
  dayArticleSchema,
  monthCollectionSchema,
  websiteId,
  orgId,
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
  });
  it('builds an Article headline from the date and carries the image', () => {
    expect(s['@type']).toBe('Article');
    expect(s.headline).toBe('May 31 — On This Day in History');
    expect(s.image).toBe(`${ORIGIN}/og/may-31.png`);
    expect(s.mainEntityOfPage).toEqual({ '@type': 'WebPage', '@id': `${ORIGIN}/may-31` });
  });
  it('does not fabricate a publish date', () => {
    expect(s).not.toHaveProperty('datePublished');
    expect(s).not.toHaveProperty('dateModified');
  });
  it('links publisher and author to the org @id', () => {
    expect(s.publisher).toEqual({ '@id': orgId(ORIGIN) });
    expect(s.author).toEqual({ '@id': orgId(ORIGIN) });
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
    });
    expect(s['@type']).toBe('CollectionPage');
    expect(s.name).toBe('May — Every Day in History');
    expect(s.isPartOf).toEqual({ '@id': websiteId(ORIGIN) });
  });
});
