# Release Calendar — Presentation Implementation Plan (Plan B of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render DateLore's release calendar — a `/releases/` hub, `/releases/[YYYY-MM]/` month pages, and a "Released on this day" section on existing day pages — wired to the Plan A loader, with release JSON-LD, an OG share image, Amazon affiliate CTAs, FTC disclosure, source attribution, and a nav link.

**Architecture:** Pure view/schema logic goes in `src/lib/` (unit-tested with Vitest, matching the repo). Astro pages/components stay presentational and are verified with `npm run build` (the repo has no `.astro` unit tests). All pages read the committed dataset via `loadReleases()`; with the empty Plan A seed they build into graceful empty states, so this plan is fully buildable before Plan C supplies data.

**Tech Stack:** Astro 5 (static, `format: 'directory'`), Vitest, Satori/resvg OG pipeline. Depends on Plan A (`src/lib/releases.ts`, `src/data/releases-types.ts`, `src/lib/releases-config.ts`).

**Prerequisite:** Plan A is merged/available on this branch (`feature/release-calendar`). Verify with `npx vitest run src/lib/releases.test.ts` (expect 7 passing) before starting.

---

### Task 1: Release view helpers

**Files:**
- Create: `src/lib/releases-view.ts`
- Test: `src/lib/releases-view.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/releases-view.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  verticalLabel, monthsInWindow, configuredMonthWindow, monthLabel, formatReleaseDate, groupByVertical,
} from './releases-view';
import type { Release } from '../data/releases-types';

const r = (over: Partial<Release>): Release => ({
  id: 'movie:tmdb:1', vertical: 'movie', title: 'X', date: '2026-06-10',
  popularity: 50, meta: { vertical: 'movie' }, sourceUrl: 'https://example.test', ...over,
});

describe('verticalLabel', () => {
  it('maps verticals to display labels', () => {
    expect(verticalLabel('game')).toBe('Game');
    expect(verticalLabel('tv')).toBe('TV');
  });
});

describe('monthsInWindow', () => {
  it('spans past..future months oldest-first, including the current month', () => {
    expect(monthsInWindow('2026-06-10', 1, 2)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08']);
  });
  it('handles year boundaries', () => {
    expect(monthsInWindow('2026-01-15', 2, 0)).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});

describe('configuredMonthWindow', () => {
  it('derives the window from the release config (2 past + current + 18 future = 21)', () => {
    expect(configuredMonthWindow('2026-06-10')).toHaveLength(21);
  });
});

describe('monthLabel', () => {
  it('formats YYYY-MM as a readable month', () => {
    expect(monthLabel('2026-06')).toBe('June 2026');
  });
});

describe('formatReleaseDate', () => {
  it('formats an ISO date without timezone math', () => {
    expect(formatReleaseDate('2026-06-10')).toBe('June 10, 2026');
  });
});

describe('groupByVertical', () => {
  it('buckets releases into the four verticals, preserving order', () => {
    const groups = groupByVertical([r({ id: 'a', vertical: 'game', meta: { vertical: 'game' } }), r({ id: 'b' })]);
    expect(groups.game.map((x) => x.id)).toEqual(['a']);
    expect(groups.movie.map((x) => x.id)).toEqual(['b']);
    expect(groups.music).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/releases-view.test.ts`
Expected: FAIL — cannot find module `./releases-view`.

- [ ] **Step 3: Implement the helpers**

`src/lib/releases-view.ts`:

```ts
import type { Release, Vertical } from '../data/releases-types';
import { RELEASE_CONFIG, type ReleaseConfig } from './releases-config';

const VERTICAL_LABELS: Record<Vertical, string> = { movie: 'Movie', tv: 'TV', game: 'Game', music: 'Music' };
export function verticalLabel(v: Vertical): string {
  return VERTICAL_LABELS[v];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// 'YYYY-MM' strings spanning pastMonths..futureMonths around `today`, oldest first.
export function monthsInWindow(today: string, pastMonths: number, futureMonths: number): string[] {
  const [y, m] = today.split('-').map(Number);
  const base = y * 12 + (m - 1); // months since year 0
  const out: string[] = [];
  for (let offset = -pastMonths; offset <= futureMonths; offset++) {
    const idx = base + offset;
    const yy = Math.floor(idx / 12);
    const mm = (idx % 12) + 1;
    out.push(`${yy}-${String(mm).padStart(2, '0')}`);
  }
  return out;
}

export function configuredMonthWindow(today: string, config: ReleaseConfig = RELEASE_CONFIG): string[] {
  const pastMonths = Math.ceil(config.activePastDays / 30);
  return monthsInWindow(today, pastMonths, config.activeFutureMonths);
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

// Human date like "June 10, 2026" from ISO YYYY-MM-DD (no Date object → no TZ drift).
export function formatReleaseDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

export function groupByVertical(releases: Release[]): Record<Vertical, Release[]> {
  const groups: Record<Vertical, Release[]> = { movie: [], tv: [], game: [], music: [] };
  for (const rel of releases) groups[rel.vertical].push(rel);
  return groups;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/releases-view.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/releases-view.ts src/lib/releases-view.test.ts
git commit -m "feat(releases): view helpers (labels, month window, date formatting)"
```

---

### Task 2: Release JSON-LD (`releaseListSchema`)

**Files:**
- Modify: `src/lib/jsonld.ts` (add import + new builder at end of file)
- Test: `src/lib/jsonld.test.ts` (append a describe block)

- [ ] **Step 1: Add the failing test**

Append to `src/lib/jsonld.test.ts` (and add `releaseListSchema` to the existing import from `./jsonld` at the top of the file):

```ts
describe('releaseListSchema', () => {
  it('is an ItemList mapping verticals to schema.org types', () => {
    const s = releaseListSchema({
      url: 'https://datelore.com/releases/2026-06',
      name: 'Releases in June 2026',
      items: [
        { vertical: 'movie', title: 'A Big Film', date: '2026-06-10', url: 'https://example.test/film', image: 'https://example.test/film.jpg' },
        { vertical: 'game', title: 'A Big Game', date: '2026-06-20', url: 'https://example.test/game' },
      ],
    });
    expect(s['@type']).toBe('ItemList');
    expect(s.itemListElement).toHaveLength(2);
    expect(s.itemListElement[0]).toMatchObject({
      '@type': 'ListItem', position: 1,
      item: { '@type': 'Movie', name: 'A Big Film', datePublished: '2026-06-10', image: 'https://example.test/film.jpg' },
    });
    expect(s.itemListElement[1].item['@type']).toBe('VideoGame');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/jsonld.test.ts`
Expected: FAIL — `releaseListSchema` is not exported.

- [ ] **Step 3: Implement the builder**

Add to the top of `src/lib/jsonld.ts` (with the other imports — currently it has none, so add this line under the header comment):

```ts
import type { Vertical } from '../data/releases-types';
```

Append at the end of `src/lib/jsonld.ts`:

```ts
const RELEASE_SCHEMA_TYPE: Record<Vertical, string> = {
  movie: 'Movie', tv: 'TVSeries', game: 'VideoGame', music: 'MusicAlbum',
};

export interface ReleaseListItem {
  vertical: Vertical;
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

/** A release calendar (hub / month / day) as a schema.org ItemList of dated works. */
export function releaseListSchema(input: ReleaseListInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: input.name,
    url: input.url,
    itemListElement: input.items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': RELEASE_SCHEMA_TYPE[it.vertical],
        name: it.title,
        datePublished: it.date,
        ...(it.url ? { sameAs: it.url } : {}),
        ...(it.image ? { image: it.image } : {}),
      },
    })),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/jsonld.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/jsonld.ts src/lib/jsonld.test.ts
git commit -m "feat(releases): releaseListSchema JSON-LD builder"
```

---

### Task 3: Releases OG share card

**Files:**
- Modify: `src/lib/og-card.ts` (add `releasesCard`)
- Test: `src/lib/og-card.test.ts` (append)
- Modify: `src/pages/og/[slug].png.ts` (add a `releases` kind + path)

- [ ] **Step 1: Add the failing test**

Append to `src/lib/og-card.test.ts` (add `releasesCard` to the existing import from `./og-card`):

```ts
describe('releasesCard', () => {
  it('returns a release-calendar card on the brand foot', () => {
    const c = releasesCard();
    expect(c.kicker).toBe('Release Calendar');
    expect(c.title).toBe('What Releases Next');
    expect(c.foot).toBe('datelore.com');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/og-card.test.ts`
Expected: FAIL — `releasesCard` is not exported.

- [ ] **Step 3: Implement `releasesCard`**

Append to `src/lib/og-card.ts`:

```ts
export function releasesCard(): CardText {
  return {
    kicker: 'Release Calendar',
    title: 'What Releases Next',
    subtitle: 'Movies, TV, games & music — curated release dates, past and future.',
    foot: FOOT,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/og-card.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Wire the card into the OG endpoint**

In `src/pages/og/[slug].png.ts`:

1. Extend the import on the `og-card` line to include `releasesCard`:

```ts
import { dayCard, monthCard, siteCard, releasesCard, type CardText } from '../../lib/og-card';
```

2. Add `releases` to the `RenderProps` union:

```ts
type RenderProps =
  | { kind: 'day'; key: string }
  | { kind: 'month'; month: number }
  | { kind: 'site' }
  | { kind: 'releases' }
  | { kind: 'logo' };
```

3. In `getStaticPaths()`, add the path just before `return paths;` (next to the `home`/`logo` pushes):

```ts
  paths.push({ params: { slug: 'releases' }, props: { kind: 'releases' } });
```

4. In `cardFor()`, handle the new kind before the final `return siteCard()` line:

```ts
  if (props.kind === 'releases') return releasesCard();
```

- [ ] **Step 6: Verify the build emits the image**

Run: `npm run build`
Expected: build succeeds and `dist/og/releases.png` exists.

- [ ] **Step 7: Commit**

```bash
git add src/lib/og-card.ts src/lib/og-card.test.ts "src/pages/og/[slug].png.ts"
git commit -m "feat(releases): OG share card for the release calendar"
```

---

### Task 4: ReleaseCard + ReleaseDisclosure components

**Files:**
- Create: `src/components/ReleaseCard.astro`
- Create: `src/components/ReleaseDisclosure.astro`

- [ ] **Step 1: Create `src/components/ReleaseCard.astro`**

```astro
---
// One release: cover, vertical tag, title, date, and an Amazon CTA. The CTA reads
// "Pre-order" for future-dated releases and "Buy on Amazon" once released. Affiliate
// links are rel="sponsored nofollow noopener" and open in a new tab.
import type { Release } from '../data/releases-types';
import { formatReleaseDate, verticalLabel } from '../lib/releases-view';

const { release, today } = Astro.props as { release: Release; today: string };
const isUpcoming = release.date >= today;
const cta = isUpcoming ? 'Pre-order' : 'Buy on Amazon';
---
<article class="card card--pad" style="display:flex;gap:var(--s4);align-items:flex-start;">
  {release.image && (
    <img src={release.image} alt="" loading="lazy" width="96" height="144"
         style="border-radius:8px;flex:0 0 auto;width:96px;height:144px;object-fit:cover;" />
  )}
  <div style="flex:1;min-width:0;">
    <span class="eyebrow eyebrow--soft">{verticalLabel(release.vertical)}</span>
    <h3 style="font-size:var(--step-1);margin-top:var(--s1);">{release.title}</h3>
    <p class="muted" style="margin-top:var(--s1);">{formatReleaseDate(release.date)}</p>
    {release.amazonUrl && (
      <a class="btn btn--ghost btn--sm" href={release.amazonUrl} target="_blank"
         rel="sponsored nofollow noopener" style="margin-top:var(--s3);">{cta} →</a>
    )}
  </div>
</article>
```

- [ ] **Step 2: Create `src/components/ReleaseDisclosure.astro`**

```astro
---
// FTC affiliate disclosure + data-source attribution (TMDB attribution is required
// by their API terms). One component so the wording stays consistent everywhere
// affiliate links appear.
---
<section class="band band--tight">
  <div class="wrap">
    <p class="muted" style="font-size:var(--step--1);">
      Release dates from <a href="https://www.themoviedb.org/" rel="nofollow noopener">TMDB</a>,
      <a href="https://www.igdb.com/" rel="nofollow noopener">IGDB</a>,
      <a href="https://musicbrainz.org/" rel="nofollow noopener">MusicBrainz</a> &amp; Spotify.
      As an Amazon Associate, DateLore earns from qualifying purchases.
    </p>
  </div>
</section>
```

- [ ] **Step 3: Verify the components compile**

Run: `npm run build`
Expected: build succeeds (components are unused so far, but must parse).

- [ ] **Step 4: Commit**

```bash
git add src/components/ReleaseCard.astro src/components/ReleaseDisclosure.astro
git commit -m "feat(releases): ReleaseCard + affiliate disclosure components"
```

---

### Task 5: `/releases/` hub page

**Files:**
- Create: `src/pages/releases/index.astro`

- [ ] **Step 1: Create the hub page**

`src/pages/releases/index.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ReleaseCard from '../../components/ReleaseCard.astro';
import ReleaseDisclosure from '../../components/ReleaseDisclosure.astro';
import { loadReleases, releasesOn, upcoming } from '../../lib/releases';
import { formatReleaseDate, monthLabel } from '../../lib/releases-view';
import { breadcrumbSchema, releaseListSchema } from '../../lib/jsonld';

const site = Astro.site!;
const abs = (p: string) => new URL(p, site).href;
const url = new URL(Astro.url.pathname, site).href;

const all = loadReleases();
const today = new Date().toISOString().slice(0, 10); // build-time "today"; nightly rebuild keeps it fresh
const ym = today.slice(0, 7);
const todays = releasesOn(all, today);
const soon = upcoming(all, today, 12);

const title = 'Release Calendar — Movies, TV, Games & Music · DateLore';
const description = 'What releases today and what is coming soon — a curated calendar of notable movie, TV, video game, and music release dates, past and future.';
const ogImage = '/og/releases.png';
const jsonld = [
  releaseListSchema({
    url,
    name: `New releases around ${formatReleaseDate(today)}`,
    items: soon.map((r) => ({ vertical: r.vertical, title: r.title, date: r.date, url: r.sourceUrl, image: r.image })),
  }),
  breadcrumbSchema([
    { name: 'DateLore', url: abs('/') },
    { name: 'Releases', url },
  ]),
];
---
<BaseLayout title={title} description={description} ogImage={ogImage} ogType="website" jsonld={jsonld}>
  <section class="band band--tight">
    <div class="wrap">
      <p class="eyebrow">Release Calendar</p>
      <h1 style="font-size:var(--step-5);">What's releasing</h1>
      <p class="lede" style="margin-top:var(--s3);">Curated movie, TV, game, and music drops — today, this month, and what's coming next.</p>
    </div>
  </section>

  <section class="band band--tight band--alt">
    <div class="wrap stack">
      <div class="section-head"><h2 style="font-size:var(--step-2);">Out today · {formatReleaseDate(today)}</h2></div>
      {todays.length
        ? <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--s4);">{todays.map((r) => <ReleaseCard release={r} today={today} />)}</div>
        : <p class="muted">No notable releases logged for today yet.</p>}
    </div>
  </section>

  <section class="band band--tight">
    <div class="wrap stack">
      <div class="section-head"><h2 style="font-size:var(--step-2);">Coming soon</h2></div>
      {soon.length
        ? <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--s4);">{soon.map((r) => <ReleaseCard release={r} today={today} />)}</div>
        : <p class="muted">Upcoming releases will appear here after the next data refresh.</p>}
      <p style="margin-top:var(--s4);"><a href={`/releases/${ym}/`} style="color:var(--gold-deep);">All of {monthLabel(ym)} →</a></p>
    </div>
  </section>

  <ReleaseDisclosure />
</BaseLayout>
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: build succeeds; `dist/releases/index.html` exists and renders empty-state copy (Plan A seed is empty).

- [ ] **Step 3: Commit**

```bash
git add src/pages/releases/index.astro
git commit -m "feat(releases): /releases hub (today + coming soon)"
```

---

### Task 6: `/releases/[YYYY-MM]/` month pages

**Files:**
- Create: `src/pages/releases/[ym].astro`

- [ ] **Step 1: Create the month page**

`src/pages/releases/[ym].astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ReleaseCard from '../../components/ReleaseCard.astro';
import ReleaseDisclosure from '../../components/ReleaseDisclosure.astro';
import { loadReleases, releasesInMonth } from '../../lib/releases';
import { configuredMonthWindow, monthLabel } from '../../lib/releases-view';
import { breadcrumbSchema, releaseListSchema } from '../../lib/jsonld';

export function getStaticPaths() {
  // Build-time "today" so the month window tracks the nightly rebuild.
  const today = new Date().toISOString().slice(0, 10);
  return configuredMonthWindow(today).map((ym) => ({ params: { ym }, props: { ym } }));
}

const { ym } = Astro.props as { ym: string };
const site = Astro.site!;
const abs = (p: string) => new URL(p, site).href;
const url = new URL(Astro.url.pathname, site).href;

const all = loadReleases();
const month = releasesInMonth(all, ym);
const label = monthLabel(ym);
const today = new Date().toISOString().slice(0, 10);

const title = `${label} Releases — Movies, TV, Games & Music · DateLore`;
const description = `Every notable movie, TV, video game, and music release in ${label}, with release dates and where to buy or pre-order.`;
const ogImage = '/og/releases.png';
const jsonld = [
  releaseListSchema({
    url,
    name: `Releases in ${label}`,
    items: month.map((r) => ({ vertical: r.vertical, title: r.title, date: r.date, url: r.sourceUrl, image: r.image })),
  }),
  breadcrumbSchema([
    { name: 'DateLore', url: abs('/') },
    { name: 'Releases', url: abs('/releases/') },
    { name: label, url },
  ]),
];
---
<BaseLayout title={title} description={description} ogImage={ogImage} ogType="article" jsonld={jsonld}>
  <section class="band band--tight">
    <div class="wrap">
      <p class="eyebrow"><a href="/releases/" style="color:var(--gold-deep);">Release Calendar</a></p>
      <h1 style="font-size:var(--step-5);">{label} releases</h1>
      <p class="lede" style="margin-top:var(--s3);">{month.length} notable {month.length === 1 ? 'release' : 'releases'} in {label}.</p>
    </div>
  </section>

  <section class="band band--tight band--alt">
    <div class="wrap">
      {month.length
        ? <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--s4);">{month.map((r) => <ReleaseCard release={r} today={today} />)}</div>
        : <p class="muted">No notable releases logged for {label} yet — check back after the next refresh.</p>}
    </div>
  </section>

  <ReleaseDisclosure />
</BaseLayout>
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: build succeeds; 21 month pages exist (e.g. `dist/releases/2026-06/index.html`) per the config window.

- [ ] **Step 3: Commit**

```bash
git add "src/pages/releases/[ym].astro"
git commit -m "feat(releases): /releases/[YYYY-MM] month pages"
```

---

### Task 7: "Released on this day" section on day pages

**Files:**
- Modify: `src/components/DayContent.astro`

- [ ] **Step 1: Add the imports**

In the frontmatter of `src/components/DayContent.astro`, after the existing `import { dayInsights } from '../lib/insights';` line, add:

```ts
import { loadReleases, releasesForDayPage } from '../lib/releases';
import { verticalLabel } from '../lib/releases-view';
```

- [ ] **Step 2: Compute the groups**

In the same frontmatter, after the line `const insights = dayInsights(entry, mm, dd);`, add:

```ts
const releaseGroups = releasesForDayPage(loadReleases(), mm, dd);
```

- [ ] **Step 3: Render the section**

In the markup, insert this block immediately after the closing `</section>` of the "By the numbers" section (the one with `band--alt`) and before the `<!-- ===== Main two-column ===== -->` comment:

```astro
<!-- ===== Released on this day (entertainment releases) ===== -->
{releaseGroups.length > 0 && (
  <section class="band band--tight">
    <div class="wrap">
      <div class="section-head">
        <h2 style="font-size:var(--step-2);">Released on {mName} {dd}</h2>
        <span class="eyebrow eyebrow--soft">Movies, games, albums &amp; shows</span>
      </div>
      <div class="stack" style="margin-top:var(--s4);">
        {releaseGroups.map((g) => (
          <div>
            <h3 style="font-size:var(--step-1);color:var(--gold-deep);">{g.year}</h3>
            <ul class="mini-list" style="margin-top:var(--s2);">
              {g.releases.map((r) => (
                <li>
                  <span class="mini-list__year">{verticalLabel(r.vertical)}</span>
                  <span class="mini-list__text">{r.amazonUrl
                    ? <a href={r.amazonUrl} target="_blank" rel="sponsored nofollow noopener">{r.title}</a>
                    : r.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p class="muted" style="margin-top:var(--s4);font-size:var(--step--1);">Release data from TMDB, IGDB, MusicBrainz &amp; Spotify. As an Amazon Associate, DateLore earns from qualifying purchases.</p>
    </div>
  </section>
)}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: build succeeds. With the empty Plan A seed, `releaseGroups` is empty so the section renders nothing on every day page (no visual change yet) — exactly the intended graceful empty state.

- [ ] **Step 5: Commit**

```bash
git add src/components/DayContent.astro
git commit -m "feat(releases): 'Released on this day' section on day pages"
```

---

### Task 8: Nav link in the header

**Files:**
- Modify: `src/components/Header.astro`

- [ ] **Step 1: Exclude `/releases` from the day-page heuristic**

In `src/components/Header.astro`, change the `isDay` line:

```ts
const isDay = path !== '/' && !['/birthday', '/quiz', '/share'].includes(path);
```

to:

```ts
const isDay = path !== '/' && !['/birthday', '/quiz', '/share'].includes(path) && !path.startsWith('/releases');
```

- [ ] **Step 2: Add the nav item**

In the `<ul>` inside `<nav class="nav">`, add this `<li>` after the "Today" item:

```astro
        <li><a href="/releases/" aria-current={path.startsWith('/releases') ? 'page' : undefined}>Releases</a></li>
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds; every page's header shows a "Releases" link, and `/releases` pages no longer mark "Today" as the current page.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.astro
git commit -m "feat(releases): add Releases link to primary nav"
```

---

### Task 9: Full build + suite verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — all existing suites plus `releases-view` (Task 1) and the appended `jsonld` / `og-card` cases (Tasks 2–3).

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds with no errors; `dist/releases/index.html`, the 21 `dist/releases/<YYYY-MM>/index.html` pages, and `dist/og/releases.png` all exist.

- [ ] **Step 3: Visual smoke test (optional but recommended)**

Run: `npm run preview` and open `/releases/` and one month page (e.g. `/releases/2026-06/`). Confirm the layout, empty-state copy, nav link, and disclosure render correctly. (Real release cards appear after Plan C loads data.)

- [ ] **Step 4: Commit any cleanup**

If `npm run build` surfaced no changes, nothing to commit. Otherwise:

```bash
git add -A
git commit -m "chore(releases): presentation build cleanup"
```

---

## Self-Review

**1. Spec coverage (presentation slice):**
- Spec §"Pages & URLs / `/releases/` hub" → Task 5. ✓
- Spec §"`/releases/[YYYY-MM]/` month pages" → Task 6 (+ `configuredMonthWindow`, Task 1). ✓
- Spec §"Day-page 'Released on this day' section" → Task 7 (uses `releasesForDayPage` from Plan A). ✓
- Spec §"SEO / AEO — JSON-LD ItemList" → Task 2 + wired in Tasks 5–6. ✓
- Spec §"OG images for releases pages" → Task 3. ✓
- Spec §"Monetization — Pre-order/Buy CTA, sponsored nofollow" → Task 4 (`ReleaseCard`). ✓
- Spec §"FTC disclosure + TMDB attribution" → Task 4 (`ReleaseDisclosure`) + Task 7 footer. ✓
- Spec §"Nav link" → Task 8. ✓
- **Deferred by design (Plan C):** `fetch-releases.ts` normalizers, threshold calibration, nightly GitHub Action, 5-year backfill, real dataset.

**2. Placeholder scan:** No "TBD/handle later" placeholders. Empty-state branches are intentional graceful rendering against Plan A's empty seed, not stubs. ✓

**3. Type consistency:** `verticalLabel`, `formatReleaseDate`, `monthLabel`, `configuredMonthWindow`, `monthsInWindow`, `groupByVertical` (Task 1); `releaseListSchema` + `ReleaseListInput`/`ReleaseListItem` (Task 2); `releasesCard` (Task 3) are referenced identically in the pages/components that consume them. Loader functions (`loadReleases`, `releasesOn`, `releasesInMonth`, `upcoming`, `releasesForDayPage`) match Plan A's exports. `ReleaseCard` props `{ release, today }` match all three call sites. ✓

## Next plan

**Plan C — Pipeline & automation:** `scripts/fetch-releases.ts` (TMDB / IGDB / MusicBrainz+Spotify normalizers → `Release[]`, pluggable popularity provider, last-good resilience), threshold calibration against live popularity data, the nightly GitHub Action (cron → regenerate `releases-active.json` → commit → push → Cloudflare build), and the one-time 5-year backfill into `releases-archive.json`. Requires user-provisioned secrets: TMDB key, Twitch app (IGDB), Spotify app, Amazon Associates tag.
```
