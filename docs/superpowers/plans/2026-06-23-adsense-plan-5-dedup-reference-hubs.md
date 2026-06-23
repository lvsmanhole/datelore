# AdSense Remediation — Plan 5: De-duplicate Reference Blurbs into Hubs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the zodiac / birthstone / birth-flower blurbs from repeating on ~30 day pages each — give the blurbs a single home (zodiac → new `/zodiac/<sign>/` hubs; birthstone + flower → the existing month hubs), link day pages to them, and remove the now-dead CSS.

**Architecture:** Component §5.5 of the design spec. Google's guidance (which the site was flagged on): "minimize repeating long segments of text across pages." The per-month `zodiacBlurb`/`birthstoneBlurb`/`flowerBlurb` paragraphs currently render in full on every one of the 366 day pages (each blurb duplicated across all dates in its sign/month). This plan moves them to single canonical locations and replaces the day-page copies with short linked badges. To avoid creating *thin* new pages, birthstone/flower blurbs go onto the **existing, substantive month hubs** (not 24 new one-paragraph pages); only zodiac (which spans month boundaries) gets its own hub pages, made substantive by listing every date under the sign (real internal-linking content).

**Tech Stack:** Astro 5 (static), TypeScript, vitest.

## Global Constraints

- Pure logic in `src/lib` (unit-tested with `npm test`); `.astro` files do presentation/wiring only. Internal links keep trailing slashes (`trailingSlash: 'always'`).
- No broken internal links (a "Zodiac" breadcrumb/link must resolve — hence a `/zodiac/` index page).
- The evergreen blurbs (`reference-content.ts`) are DateLore's own writing — relocate them, do not delete them.
- Existing helpers: `zodiacForDate(m,d)`, `birthstoneForMonth(m)`, `birthFlowerForMonth(m)` (`src/lib/reference.ts`); `zodiacBlurb(sign)`, `birthstoneBlurb(m)`, `flowerBlurb(m)`, `monthBlurb(m)` (`src/lib/reference-content.ts`); `toSlug`, `monthName`, `sortKeysByDate`, `MONTHS` (`src/lib/slug.ts`); `breadcrumbSchema` (`src/lib/jsonld.ts`). `DATES: Record<string, DayEntry>` from `src/data/dates.js`.

## File Structure

- **Modify** `src/lib/reference.ts` — export `ZODIAC_SIGNS` (the `{sign, glyph}` list) for routing.
- **Create** `src/lib/zodiac.ts` — `signSlug`, `signFromSlug`, `daysUnderSign` (pure).
- **Create** `src/lib/zodiac.test.ts`.
- **Create** `src/pages/zodiac/index.astro` — lists the 12 signs.
- **Create** `src/pages/zodiac/[sign].astro` — one hub per sign: blurb + glyph + date range + every date under the sign (internal links).
- **Modify** `src/components/MonthContent.astro` — add the birthstone + flower blurbs (their new canonical home).
- **Modify** `src/components/DayContent.astro` — remove the three blurb cards; make the header badges link to the hubs; drop now-unused blurb imports.
- **Modify** `src/styles/global.css` — remove the dead `.timeline__desc` / `.timeline__tag` / `.twin__line` rules (left over from Plan 3's demotion).

---

### Task 1: Zodiac routing helpers

**Files:**
- Modify: `src/lib/reference.ts`
- Create: `src/lib/zodiac.ts`
- Test: `src/lib/zodiac.test.ts`

**Interfaces:**
- Consumes: `zodiacForDate` + `Zodiac` from `./reference`.
- Produces:
  - `ZODIAC_SIGNS: Zodiac[]` (exported from `reference.ts`)
  - `signSlug(sign: string): string`
  - `daysUnderSign(sign: string, keys: string[]): string[]`

- [ ] **Step 1: Write the failing test** — `src/lib/zodiac.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { signSlug, daysUnderSign } from './zodiac';

describe('signSlug', () => {
  it('lowercases the sign name into a URL slug', () => {
    expect(signSlug('Gemini')).toBe('gemini');
  });
});

describe('daysUnderSign', () => {
  it('selects only keys whose date falls under the sign (Gemini = May 21 – Jun 20)', () => {
    const keys = ['05-20', '05-21', '06-20', '06-21'];
    expect(daysUnderSign('Gemini', keys)).toEqual(['05-21', '06-20']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- "lib/zodiac"`
Expected: FAIL — `./zodiac` module does not exist.

- [ ] **Step 3a: Export the sign list from `src/lib/reference.ts`**

Immediately AFTER the `ZODIAC` array definition (the `const ZODIAC: {...}[] = [ ... ];` block), add:

```ts
/** Public list of the 12 signs (name + glyph), for routing and hub pages. */
export const ZODIAC_SIGNS: Zodiac[] = ZODIAC.map((z) => ({ sign: z.sign, glyph: z.glyph }));
```

- [ ] **Step 3b: Implement** — `src/lib/zodiac.ts`

```ts
// Helpers for the /zodiac/<sign>/ hub pages. Pure; reuses zodiacForDate so the
// "which dates fall under this sign" logic has exactly one source of truth.
import { zodiacForDate } from './reference';

export function signSlug(sign: string): string {
  return sign.toLowerCase();
}

/** The MM-DD keys (from `keys`) whose date falls under `sign`, in input order. */
export function daysUnderSign(sign: string, keys: string[]): string[] {
  return keys.filter((k) => {
    const [mm, dd] = k.split('-').map(Number);
    return zodiacForDate(mm, dd).sign === sign;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- "lib/zodiac"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reference.ts src/lib/zodiac.ts src/lib/zodiac.test.ts
git commit -m "feat(zodiac): sign list export + slug/daysUnderSign helpers"
```

---

### Task 2: Zodiac hub pages (`/zodiac/` index + `/zodiac/<sign>/`)

**Files:**
- Create: `src/pages/zodiac/index.astro`
- Create: `src/pages/zodiac/[sign].astro`

**Interfaces:**
- Consumes: `ZODIAC_SIGNS` (Task 1), `signSlug` + `daysUnderSign` (Task 1), `zodiacBlurb` (`reference-content`), `DATES`, `toSlug`/`monthName`/`sortKeysByDate` (`slug`), `breadcrumbSchema` (`jsonld`).
- Produces: 13 new pages (`/zodiac/` + 12 signs).

- [ ] **Step 1: Create the index** — `src/pages/zodiac/index.astro`

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { ZODIAC_SIGNS } from '../../lib/reference';
import { signSlug } from '../../lib/zodiac';
import { breadcrumbSchema } from '../../lib/jsonld';

const abs = (p: string) => new URL(p, Astro.site).href;
const jsonld = [
  breadcrumbSchema([
    { name: 'DateLore', url: abs('/') },
    { name: 'Zodiac', url: abs('/zodiac/') },
  ]),
];
---
<BaseLayout
  title="The Zodiac Signs — Dates & Traits · DateLore"
  description="All twelve zodiac signs, their date ranges, and the traits behind each — with every birthday that falls under them."
  jsonld={jsonld}
>
  <section class="band band--tight">
    <div class="wrap">
      <p class="eyebrow">The Almanac · Zodiac</p>
      <h1 style="font-size:var(--step-6);line-height:.95;margin-top:var(--s3);">The Zodiac</h1>
      <p class="lede" style="margin-top:var(--s3);max-width:60ch;">
        Twelve signs, twelve stretches of the calendar. Pick a sign to read its character and see every date that falls under it.
      </p>
      <ul style="list-style:none;padding:0;margin-top:var(--s5);display:grid;gap:var(--s3);grid-template-columns:repeat(auto-fill,minmax(160px,1fr));">
        {ZODIAC_SIGNS.map((z) => (
          <li><a href={`/zodiac/${signSlug(z.sign)}/`}>{z.glyph} {z.sign} →</a></li>
        ))}
      </ul>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Create the per-sign hub** — `src/pages/zodiac/[sign].astro`

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { DATES } from '../../data/dates.js';
import { ZODIAC_SIGNS } from '../../lib/reference';
import { signSlug, daysUnderSign } from '../../lib/zodiac';
import { zodiacBlurb } from '../../lib/reference-content';
import { toSlug, monthName, sortKeysByDate } from '../../lib/slug';
import { breadcrumbSchema } from '../../lib/jsonld';

export function getStaticPaths() {
  return ZODIAC_SIGNS.map((z) => ({
    params: { sign: signSlug(z.sign) },
    props: { sign: z.sign, glyph: z.glyph },
  }));
}

const { sign, glyph } = Astro.props as { sign: string; glyph: string };
const abs = (p: string) => new URL(p, Astro.site).href;
const url = new URL(Astro.url.pathname, Astro.site).href;

const dayKeys = sortKeysByDate(daysUnderSign(sign, Object.keys(DATES)));
const days = dayKeys.map((k) => {
  const [mm, dd] = k.split('-').map(Number);
  return { slug: toSlug(k), label: `${monthName(mm)} ${dd}` };
});
const rangeLabel = days.length ? `${days[0].label} – ${days[days.length - 1].label}` : '';

const title = `${sign} ${glyph} — Dates & Traits · DateLore`;
const description = `${sign} (${rangeLabel}): the sign's character and every date that falls under it on the DateLore almanac.`;
const jsonld = [
  breadcrumbSchema([
    { name: 'DateLore', url: abs('/') },
    { name: 'Zodiac', url: abs('/zodiac/') },
    { name: sign, url },
  ]),
];
---
<BaseLayout title={title} description={description} ogType="article" jsonld={jsonld}>
  <section class="band band--tight">
    <div class="wrap">
      <p class="eyebrow">Zodiac</p>
      <h1 style="font-size:var(--step-6);line-height:.95;margin-top:var(--s3);">
        {sign} <span style="color:var(--gold-deep);">{glyph}</span>
      </h1>
      <p class="lede" style="margin-top:var(--s3);max-width:60ch;">{zodiacBlurb(sign)}</p>
      {rangeLabel && <p class="muted" style="margin-top:var(--s3);">Born {rangeLabel} · {days.length} dates fall under {sign}.</p>}
    </div>
  </section>
  <section class="band band--tight band--alt">
    <div class="wrap">
      <div class="section-head"><h2 style="font-size:var(--step-2);">Every day under {sign}</h2><span class="eyebrow eyebrow--soft">Pick a date</span></div>
      <ul style="list-style:none;padding:0;margin-top:var(--s4);display:grid;gap:var(--s2);grid-template-columns:repeat(auto-fill,minmax(150px,1fr));">
        {days.map((d) => (
          <li><a href={`/${d.slug}/`}>{d.label}</a></li>
        ))}
      </ul>
      <p style="margin-top:var(--s5);"><a href="/zodiac/">‹ All zodiac signs</a></p>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
- `ls dist/zodiac/` → shows `index.html` and 12 sign dirs (`gemini/`, `aries/`, …)
- `grep -o 'Every day under Gemini' dist/zodiac/gemini/index.html | wc -l` → Expected `1`
- `grep -c 'dates fall under Gemini' dist/zodiac/gemini/index.html` → Expected `1`
- `grep -o 'href="/may-21/"' dist/zodiac/gemini/index.html | wc -l` → Expected ≥ 1 (a Gemini date links to its day page)
- `grep -o 'href="/zodiac/gemini/"' dist/zodiac/index.html | wc -l` → Expected `1` (index links each sign)

- [ ] **Step 4: Commit**

```bash
git add src/pages/zodiac/index.astro "src/pages/zodiac/[sign].astro"
git commit -m "feat(zodiac): /zodiac index + per-sign hub pages"
```

---

### Task 3: Move birthstone + flower blurbs onto the month hubs

**Files:**
- Modify: `src/components/MonthContent.astro`

**Interfaces:**
- Consumes: `birthstoneBlurb` + `flowerBlurb` from `reference-content` (add to the existing import); `stone`/`flower`/`mName`/`month` already computed in this component.
- Produces: each month hub now carries the birthstone + flower blurbs (their canonical home).

- [ ] **Step 1: Extend the reference-content import**

In `src/components/MonthContent.astro`, change the existing import line:

```ts
import { monthBlurb } from '../lib/reference-content';
```

to:

```ts
import { monthBlurb, birthstoneBlurb, flowerBlurb } from '../lib/reference-content';
```

- [ ] **Step 2: Add the blurb section after the month header**

Find the closing `</section>` of the first section (the month header that ends right after the badges block). Immediately AFTER it, insert:

```astro
<!-- ===== Birthstone & birth flower (canonical home for these blurbs) ===== -->
<section class="band band--tight band--alt">
  <div class="wrap">
    <div class="section-head"><h2 style="font-size:var(--step-2);">Born in {mName}</h2></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--s4);margin-top:var(--s4);">
      <div class="card card--pad"><p class="eyebrow">Birthstone · {stone}</p><p style="margin-top:var(--s2);">{birthstoneBlurb(month)}</p></div>
      <div class="card card--pad"><p class="eyebrow eyebrow--coral">Birth flower · {flower}</p><p style="margin-top:var(--s2);">{flowerBlurb(month)}</p></div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
- `grep -o 'Born in May' dist/may/index.html | wc -l` → Expected `1`
- `grep -c 'Birthstone · Emerald' dist/may/index.html` → Expected `1`
- `grep -o "Birth flower · Lily of the Valley" dist/may/index.html | wc -l` → Expected `1`

- [ ] **Step 4: Commit**

```bash
git add src/components/MonthContent.astro
git commit -m "feat(dedup): birthstone + flower blurbs live on month hubs"
```

---

### Task 4: De-duplicate the day page (remove blurb cards, link badges to hubs)

**Files:**
- Modify: `src/components/DayContent.astro`

**Interfaces:**
- Consumes: `signSlug` from `../lib/zodiac` (new import); `z.sign`/`stone`/`flower`/`monthSlug` already computed.
- Produces: day pages with NO repeated blurb paragraphs; header badges link to the hubs.

- [ ] **Step 1: Swap imports**

In `src/components/DayContent.astro`, remove the now-unused blurb import:

```ts
import { zodiacBlurb, birthstoneBlurb, flowerBlurb } from '../lib/reference-content';
```

and add:

```ts
import { signSlug } from '../lib/zodiac';
```

- [ ] **Step 2: Make the header badges link to the hubs**

Replace the `.badges` block:

```astro
    <div class="badges" style="margin-top:var(--s5);">
      <span class="badge"><span class="badge__glyph">{z.glyph}</span><span class="badge__text"><span class="badge__label">Zodiac</span><span class="badge__value">{z.sign}</span></span></span>
      <span class="badge"><span class="badge__glyph">◈</span><span class="badge__text"><span class="badge__label">Birthstone</span><span class="badge__value">{stone}</span></span></span>
      <span class="badge badge--coral"><span class="badge__glyph">❀</span><span class="badge__text"><span class="badge__label">Birth flower</span><span class="badge__value">{flower}</span></span></span>
    </div>
```

with (each badge becomes an anchor to its hub):

```astro
    <div class="badges" style="margin-top:var(--s5);">
      <a class="badge" href={`/zodiac/${signSlug(z.sign)}/`}><span class="badge__glyph">{z.glyph}</span><span class="badge__text"><span class="badge__label">Zodiac</span><span class="badge__value">{z.sign}</span></span></a>
      <a class="badge" href={`/${monthSlug}/`}><span class="badge__glyph">◈</span><span class="badge__text"><span class="badge__label">Birthstone</span><span class="badge__value">{stone}</span></span></a>
      <a class="badge badge--coral" href={`/${monthSlug}/`}><span class="badge__glyph">❀</span><span class="badge__text"><span class="badge__label">Birth flower</span><span class="badge__value">{flower}</span></span></a>
    </div>
```

- [ ] **Step 3: Remove the three blurb cards from "The shape of the day"**

Replace this block:

```astro
    <p class="lede" style="margin-top:0;">{insightProseText}</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--s4);margin-top:var(--s2);">
      <div class="card card--pad"><p class="eyebrow">Zodiac · {z.sign}</p><p style="margin-top:var(--s2);">{zodiacBlurb(z.sign)}</p></div>
      <div class="card card--pad"><p class="eyebrow">Birthstone · {stone}</p><p style="margin-top:var(--s2);">{birthstoneBlurb(mm)}</p></div>
      <div class="card card--pad"><p class="eyebrow eyebrow--coral">Birth flower · {flower}</p><p style="margin-top:var(--s2);">{flowerBlurb(mm)}</p></div>
    </div>
```

with:

```astro
    <p class="lede" style="margin-top:0;">{insightProseText}</p>
    <p class="muted" style="margin-top:var(--s2);font-size:var(--step--1);">
      {z.sign} is the sign for {mName} {dd} — read more on the <a href={`/zodiac/${signSlug(z.sign)}/`}>{z.sign} page</a>, or see {mName}'s <a href={`/${monthSlug}/`}>birthstone &amp; birth flower</a>.
    </p>
```

- [ ] **Step 4: Build and verify (the duplicated blurb text is gone, links resolve)**

Run: `npm test` → all pass.
Run: `npm run build`
- `grep -c 'fixed air' dist/january-1/index.html` → Expected `0` (a phrase from the Aquarius blurb no longer renders on the day page). For January 1 (Capricorn), use: `grep -c 'sea-goat' dist/january-1/index.html` → Expected `0` (Capricorn blurb text gone from the day page)
- `grep -o 'sea-goat' dist/zodiac/capricorn/index.html | wc -l` → Expected ≥ 1 (the blurb now lives on the hub)
- `grep -o 'href="/zodiac/capricorn/"' dist/january-1/index.html | wc -l` → Expected ≥ 1 (day page links to the sign hub)
- `grep -o "January's garnet" dist/january-1/index.html | wc -l` → Expected `0` (birthstone blurb text gone from the day page)
- `grep -o "January's garnet" dist/january/index.html | wc -l` → Expected `1` (now on the month hub)

- [ ] **Step 5: Commit**

```bash
git add src/components/DayContent.astro
git commit -m "feat(dedup): day pages link to zodiac/month hubs instead of repeating blurbs"
```

---

### Task 5: Remove the dead CSS from Plan 3's demotion

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: nothing.
- Produces: smaller CSS; no rules for elements that no longer render.

- [ ] **Step 1: Delete the unused rules**

In `src/styles/global.css`, delete the `.timeline__desc` rule:

```css
.timeline__desc { color: var(--ink-soft); font-size: var(--step-0); }
```

delete the `.timeline__tag` rule:

```css
.timeline__tag {
  display: inline-block; margin-top: var(--s2); font-size: var(--step--2);
  text-transform: uppercase; letter-spacing: .1em; font-weight: 600;
  color: var(--ink-faint); font-family: var(--font-mono);
}
```

and delete the `.twin__line` rule:

```css
.twin__line { font-size: var(--step--1); color: var(--ink-soft); margin-top: var(--s2); }
```

- [ ] **Step 2: Build and verify**

Run: `npm run build` → succeeds.
- `grep -c 'timeline__desc' dist/january-1/index.html` → Expected `0` (already true; confirms nothing references it)
- `grep -rc 'timeline__desc' src/` → Expected `0` (selector fully removed from source)
- `grep -rc 'twin__line' src/` → Expected `0`

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "chore(css): remove dead rules for demoted timeline/twin descriptions"
```

---

## Self-Review

**Spec coverage (§5.5 de-dup):**
- Zodiac blurbs relocated to `/zodiac/<sign>/` hubs (substantive: blurb + date range + every date under the sign) → Tasks 1, 2. ✓
- Birthstone + flower blurbs relocated to existing month hubs (no new thin pages) → Task 3. ✓
- Day pages stop repeating all three blurbs; header badges + a one-line pointer link to the hubs → Task 4. ✓
- `/zodiac/` index prevents a broken "Zodiac" breadcrumb/link → Task 2. ✓
- Dead CSS removed → Task 5. ✓
- (Takes/essays pipeline = Plan 4. Not in scope.)

**Placeholder scan:** No TBD/TODO; every step shows full code/exact before-after; every command has an expected result. ✓

**Type consistency:** `ZODIAC_SIGNS: Zodiac[]` (Task 1) consumed by both hub files (Task 2); `signSlug`/`daysUnderSign` (Task 1) consumed in Task 2 + Task 4 (`[sign].astro` receives the sign via props, so no slug→sign reverse lookup is needed). The day page's removed `zodiacBlurb`/`birthstoneBlurb`/`flowerBlurb` imports (Task 4) are confirmed unused after the card removal. ✓
