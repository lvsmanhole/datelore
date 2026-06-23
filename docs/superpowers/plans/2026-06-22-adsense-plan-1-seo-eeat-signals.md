# AdSense Remediation — Plan 1: Technical SEO & E-E-A-T Signals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing authorship, freshness, and internal-link signals that AdSense/Google quality systems look for, without touching page content — the safe, immediately-shippable slice of Component 6 from the spec.

**Architecture:** DateLore is a static Astro site. Pure logic lives in `src/lib` (unit-tested with vitest); `.astro` files only present/wire. This plan extends the pure JSON-LD builders (TDD), adds a build-timestamp module, and wires the new schema + a visible byline + homepage month links into the templates (verified by build).

**Tech Stack:** Astro 5 (static, `trailingSlash: 'always'`), TypeScript, vitest, `@astrojs/sitemap`.

## Global Constraints

- Internal links must always end with a trailing slash (`/may-31/`, `/january/`) — `trailingSlash: 'always'`.
- Pure logic goes in `src/lib` and is unit-tested; `.astro` files do presentation/wiring only.
- `dateModified` must be the **real build timestamp** only — never a fabricated date (honesty rule from the spec; the site fully regenerates each build).
- Author identity is **`Roman Tailor`**; the Person `@id` is exactly `` `${origin}/about/#person` ``.
- Run tests with `npm test` (alias for `vitest run`). Build with `npm run build`. Commit after each task.
- Already done — do NOT redo: `pins/index.astro`, `video-pins/index.astro`, `share.astro` are already `noindex`; the quick-date form already navigates with a trailing slash; `about.astro` already has a Person schema + bio.

## File Structure

- **Create** `src/lib/build-meta.ts` — single build-timestamp constant `BUILD_ISO`, consumed by the day template + byline.
- **Modify** `src/lib/jsonld.ts` — add `personId` + `personSchema`; add `dateModified` and a Person `author` to `dayArticleSchema`.
- **Modify** `src/lib/jsonld.test.ts` — update the now-stale day-article expectations; add `personSchema` tests.
- **Modify** `src/pages/[slug].astro` — pass `dateModified: BUILD_ISO`; add `personSchema(origin)` to the day-page JSON-LD graph.
- **Modify** `src/pages/about.astro` — use the shared `personSchema` so the `@id` matches what day pages reference.
- **Modify** `src/components/DayContent.astro` — visible "Compiled & reviewed by … · Last reviewed …" byline.
- **Modify** `src/pages/index.astro` — a "Browse the calendar by month" section linking all 12 hubs (fixes the all-pages `/may-31/` internal-link concentration).
- **Modify** `astro.config.mjs` — exclude `/pins/` and `/video-pins/` from the sitemap.

---

### Task 1: Extend day Article schema — `dateModified` + Person `author`

**Files:**
- Modify: `src/lib/jsonld.ts`
- Test: `src/lib/jsonld.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `personId(origin: string): string` → `` `${origin}/about/#person` ``
  - `personSchema(origin: string): object` (a `Person` node with that `@id`)
  - `DayArticleInput` gains `dateModified: string` (ISO timestamp)
  - `dayArticleSchema(d)` now emits `dateModified: d.dateModified` and `author: { '@id': personId(d.origin) }`

- [ ] **Step 1: Update the import + stale expectations in the test (write the failing tests)**

In `src/lib/jsonld.test.ts`, change the import block (lines 2–11) to add `personId` and `personSchema`:

```ts
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
```

In the `dayArticleSchema` describe block, add `dateModified` to the input object (currently lines 51–58):

```ts
  const s = dayArticleSchema({
    origin: ORIGIN,
    url: `${ORIGIN}/may-31`,
    monthName: 'May',
    day: 31,
    description: 'What happened on May 31.',
    image: `${ORIGIN}/og/may-31.png`,
    dateModified: '2026-06-22T08:00:00.000Z',
  });
```

Replace the "does not fabricate a publish date" test (lines 65–68) with:

```ts
  it('omits datePublished but carries an honest build-time dateModified', () => {
    expect(s).not.toHaveProperty('datePublished');
    expect(s.dateModified).toBe('2026-06-22T08:00:00.000Z');
  });
```

Replace the publisher/author test (lines 69–72) with:

```ts
  it('links publisher to the org and author to the named Person', () => {
    expect(s.publisher).toEqual({ '@id': orgId(ORIGIN) });
    expect(s.author).toEqual({ '@id': personId(ORIGIN) });
  });
```

Add a new describe block after the `dayArticleSchema` block (after line 73):

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- jsonld`
Expected: FAIL — `personId`/`personSchema` are not exported (import error), and `s.dateModified` is `undefined`.

- [ ] **Step 3: Implement in `src/lib/jsonld.ts`**

Add the Person builders after `organizationSchema` (after line 46):

```ts
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
```

Add `dateModified` to `DayArticleInput` (inside the interface at lines 61–68):

```ts
  image: string; // absolute OG image URL
  dateModified: string; // ISO timestamp of the last site rebuild (honest freshness signal)
```

Replace the doc comment + body of `dayArticleSchema` (lines 70–88) with:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- jsonld`
Expected: PASS (all `jsonld` describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/jsonld.ts src/lib/jsonld.test.ts
git commit -m "feat(seo): add Person author + build-time dateModified to day Article schema"
```

---

### Task 2: Build-timestamp module + wire schema into day pages and About

**Files:**
- Create: `src/lib/build-meta.ts`
- Modify: `src/pages/[slug].astro`
- Modify: `src/pages/about.astro`

**Interfaces:**
- Consumes: `dayArticleSchema` (now requires `dateModified`), `personSchema`, `personId` (Task 1).
- Produces: `BUILD_ISO: string` from `src/lib/build-meta.ts`.

- [ ] **Step 1: Create `src/lib/build-meta.ts`**

```ts
// Build timestamp, evaluated once per build. The whole static site is regenerated
// and redeployed on every build (data refresh, OG cards, release window all rebake),
// so this is an honest "last regenerated" signal — not an invented date. It mirrors
// the sitemap's <lastmod>, which is also stamped at build time (see astro.config.mjs).
export const BUILD_ISO: string = new Date().toISOString();
```

- [ ] **Step 2: Wire it into `src/pages/[slug].astro`**

Add to the imports (after line 11, the `jsonld` import): include `personSchema` in the existing import and add the build-meta import. The import block becomes:

```ts
import {
  breadcrumbSchema,
  dayArticleSchema,
  monthCollectionSchema,
  personSchema,
} from '../lib/jsonld';
import { BUILD_ISO } from '../lib/build-meta';
```

In the `props.kind === 'day'` branch, replace the `jsonld = [...]` assignment (lines 51–58) with:

```ts
  jsonld = [
    dayArticleSchema({ origin, url, monthName: mName, day: dd, description, image: abs(ogImage), dateModified: BUILD_ISO }),
    personSchema(origin),
    breadcrumbSchema([
      { name: 'DateLore', url: abs('/') },
      { name: mName, url: abs(`/${monthSlug}/`) },
      { name: `${mName} ${dd}`, url },
    ]),
  ];
```

- [ ] **Step 3: Make `about.astro` use the shared Person (matching `@id`)**

In `src/pages/about.astro`, change the imports (line 3) to add `personSchema`:

```ts
import { breadcrumbSchema, personSchema } from '../lib/jsonld';
```

Add an origin constant after `const abs = ...` (line 5):

```ts
const origin = Astro.site!.origin;
```

Replace the inline Person object in the `jsonld` array (lines 10–17) with `personSchema(origin)` so the `@id` matches what day pages reference:

```ts
const jsonld = [
  breadcrumbSchema([
    { name: 'DateLore', url: abs('/') },
    { name: 'About', url: abs('/about/') },
  ]),
  personSchema(origin),
];
```

- [ ] **Step 4: Build and verify the schema lands on a day page**

Run: `npm run build`
Then verify the rendered day page carries the new fields:

Run: `grep -o '"dateModified":"[^"]*"' dist/may-31/index.html` → Expected: one match with an ISO timestamp.
Run: `grep -o '"@type":"Person"' dist/may-31/index.html` → Expected: at least one match.
Run: `grep -o '#person' dist/may-31/index.html` → Expected: the author `@id` reference is present.

- [ ] **Step 5: Commit**

```bash
git add src/lib/build-meta.ts src/pages/[slug].astro src/pages/about.astro
git commit -m "feat(seo): emit dateModified + Person author graph on day pages"
```

---

### Task 3: Visible byline + last-reviewed line on day pages

**Files:**
- Modify: `src/components/DayContent.astro`

**Interfaces:**
- Consumes: `BUILD_ISO` (Task 2).
- Produces: a visible, human-readable authorship line on every day page (matches the Article `author`/`dateModified` schema so the claim is not invisible).

- [ ] **Step 1: Import the build timestamp and format a label**

In `src/components/DayContent.astro`, add to the frontmatter imports (after line 11):

```ts
import { BUILD_ISO } from '../lib/build-meta';
```

Add near the other computed constants (after line 26, `const insights = ...`):

```ts
const reviewedLabel = new Date(BUILD_ISO).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
```

- [ ] **Step 2: Render the byline in the date header**

In the first `<section>` (the date header), insert the byline immediately after the badges `</div>` (after line 80, before the `</div>` that closes `.wrap` on line 81):

```astro
    <p class="muted" style="margin-top:var(--s4);font-size:var(--step--1);">
      Compiled &amp; reviewed by <a href="/about/" rel="author" style="color:var(--gold-deep);">Roman Tailor</a> · Last reviewed {reviewedLabel}
    </p>
```

- [ ] **Step 3: Build and verify the byline renders**

Run: `npm run build`
Run: `grep -o 'Compiled &amp; reviewed by' dist/may-31/index.html` → Expected: one match.
Run: `grep -o 'rel="author"' dist/may-31/index.html` → Expected: one match.

- [ ] **Step 4: Commit**

```bash
git add src/components/DayContent.astro
git commit -m "feat(seo): show visible author byline + last-reviewed on day pages"
```

---

### Task 4: Homepage "Browse the calendar by month" internal links

**Files:**
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `MONTHS` from `src/lib/slug`.
- Produces: 12 in-body links from the homepage to every month hub (distributes internal link weight beyond the single hardcoded `/may-31/`).

- [ ] **Step 1: Import the month list**

In `src/pages/index.astro`, change the slug import (line 4) to include `MONTHS`:

```ts
import { toSlug, monthName, MONTHS } from '../lib/slug';
```

- [ ] **Step 2: Add the section before the daily-quiz teaser**

Insert this new section immediately before the `<!-- ===== Daily quiz teaser ===== -->` comment (currently line 123):

```astro
  <!-- ===== Browse by month (internal-link surface) ===== -->
  <section class="band band--tight band--alt">
    <div class="wrap">
      <div class="section-head">
        <h2>Browse the calendar by month</h2>
        <span class="eyebrow eyebrow--soft">All 366 days</span>
      </div>
      <ul style="list-style:none;padding:0;margin-top:var(--s4);display:grid;gap:var(--s3);grid-template-columns:repeat(auto-fill,minmax(170px,1fr));">
        {MONTHS.map((m) => (
          <li><a href={`/${m.toLowerCase()}/`}>See all days in {m} →</a></li>
        ))}
      </ul>
    </div>
  </section>
```

- [ ] **Step 3: Build and verify all 12 month links render in the homepage body**

Run: `npm run build`
Run: `grep -o 'See all days in' dist/index.html | wc -l` → Expected: `12`.
Run: `grep -o 'href="/january/"' dist/index.html` → Expected: one match (sample check that links carry trailing slashes).

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(seo): add homepage month-hub links to spread internal link weight"
```

---

### Task 5: Drop internal tool pages from the sitemap

**Files:**
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: a sitemap that no longer advertises the `noindex` internal queue pages (`/pins/`, `/video-pins/`), saving crawl budget.

- [ ] **Step 1: Broaden the sitemap filter**

In `astro.config.mjs`, replace the `filter` line inside `sitemap({...})`:

```js
      filter: (page) => !page.includes('/share/'),
```

with:

```js
      filter: (page) =>
        !page.includes('/share/') &&
        !page.includes('/pins/') &&
        !page.includes('/video-pins/'),
```

- [ ] **Step 2: Build and verify the pages are gone from the sitemap**

Run: `npm run build`
Run: `grep -c '/pins/' dist/sitemap-0.xml` → Expected: `0`.
Run: `grep -c '/video-pins/' dist/sitemap-0.xml` → Expected: `0`.
Run: `grep -c '/may-31/' dist/sitemap-0.xml` → Expected: `1` (real day pages still present).

- [ ] **Step 3: Commit**

```bash
git add astro.config.mjs
git commit -m "chore(seo): exclude internal queue pages from sitemap"
```

---

## Self-Review

**Spec coverage (Component 6 slice):**
- noindex internal/non-content pages → already done in code (verified); sitemap exclusion added (Task 5). ✓
- `dateModified` freshness → Tasks 1–2. ✓
- Person author + visible byline + about alignment → Tasks 1–3. ✓
- Homepage internal-link distribution → Task 4. ✓
- Quick-date form trailing slash → already correct (verified), no task needed. ✓
- (De-duplication / takes / essays / demotion are Plans 2–3, out of scope here.)

**Placeholder scan:** No TBD/TODO; every code step shows the exact code; every command has expected output. ✓

**Type consistency:** `personId`/`personSchema` defined in Task 1 and consumed by the same names in Task 2; `DayArticleInput.dateModified` added in Task 1 and supplied as `dateModified: BUILD_ISO` in Task 2; `BUILD_ISO` created in Task 2 and consumed in Task 3. ✓
