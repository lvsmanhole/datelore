# Keyword-Informed Daily Pinterest Pins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing born/history Pinterest pin engine with a `src/data/pins/<MM>/<DD>/` folder of authored pin specs, seeded with evergreen "Released on this day" pins, all flowing into the existing `/pins.json` manifest for manual posting.

**Architecture:** Each pin is a small validated JSON file. A build-only loader (`import.meta.glob`, mirroring `src/data/dates.ts`) reads them, validates, maps each to the existing `PinText` (for the Satori renderer) and `PinManifestEntry` (for `/pins.json`). Born/history keep auto-generating untouched. Release pins are produced by a pure `releasePin()` and written to the folder by an idempotent seeder. Posting is manual for now; the auto-poster stays built but dormant.

**Tech Stack:** Astro 5 (static), TypeScript, Satori + resvg (image render), Vitest (tests), tsx (scripts). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-13-pinterest-daily-pins-design.md` (Phase 1 only; Phase 2 video is exploration, not in this plan).

---

## File Structure

- Create `docs/pinterest-keyword-strategy.md` — Phase-0 research output (board name, title templates, description formula, hashtags, priority dates).
- Create `src/lib/pin-spec.ts` — `PinSpec` type, `PinSpecKind`, `ALLOWED_BOARDS`, `validatePinSpec()`.
- Create `src/lib/pin-spec.test.ts`.
- Create `src/lib/pin-content.ts` — pure helpers (`parseDayFromPinPath`, `campaignForKind`, `pinSpecToText`, `pinSpecToManifest`, `orderPinSpecs`) + build-only `loadPinSpecs()`.
- Create `src/lib/pin-content.test.ts`.
- Create `src/lib/release-pin.ts` — `releasePin()`, `RELEASE_PIN_MIN_POP`, `RELEASE_PIN_MAX_ITEMS`.
- Create `src/lib/release-pin.test.ts`.
- Create `src/lib/pin-tree.ts` — `pinTree()` extracted from the pin page (so it is reusable + testable).
- Create `src/lib/pin-tree.test.ts`.
- Create `src/lib/pins-manifest.test.ts` — full-manifest guard tests.
- Create `scripts/seed-release-pins.ts` — idempotent release-pin seeder.
- Create `src/pages/pins/index.astro` — manual posting-queue page (`noindex`).
- Create `docs/daily-pins.md` — authoring + manual-posting docs.
- Generated (by the seeder): `src/data/pins/<MM>/<DD>/release.json`.
- Modify `src/lib/utm.ts` — generalize `pinDestination(daySlug, campaign)`.
- Modify `src/lib/utm.test.ts` — update `pinDestination` calls.
- Modify `src/lib/pin-card.ts` — export `SENSITIVE`; widen `PinText.kind` to `string`.
- Modify `src/lib/pins-manifest.ts` — append folder pins; widen `PinManifestEntry.kind`; use new `pinDestination` campaign args.
- Modify `src/pages/pin/[slug].png.ts` — import `pinTree`; render folder pins.
- Modify `package.json` — add `pins:seed` script.

---

## Task 1: Phase 0 — Pinterest keyword research

This is a research/content task (no code). It produces the single source for board name, pin-title wording, description formula, and hashtags that later tasks reference. Later code tasks ship with sensible **defaults** (below); this doc confirms or refines them.

**Files:**
- Create: `docs/pinterest-keyword-strategy.md`

- [ ] **Step 1: Harvest Pinterest-search demand**

Use the `/browse` skill to collect what Pinterest itself suggests (autocomplete + "more ideas"/related) for these seeds, and note 3–5 high-engagement competitor pins per seed (their title pattern, description structure, hashtags, board names):
`born on this day`, `[zodiac] personality`, `on this day in history`, `[month] facts`, `birthday facts`, `movies released in [year]`, `nostalgia`.

- [ ] **Step 2: Write the strategy doc**

Write `docs/pinterest-keyword-strategy.md` with these sections, each filled with concrete findings:
- **Board names** — final names for the three boards (default release board: `Released On This Day`).
- **Title templates** per pin kind — confirm/replace: born `Born on [Month] [Day]?`, history `[Month] [Day] in History`, release `Released on [Month] [Day]`.
- **Description formula** — default: `<lines joined by " · "> — <Month> <Day> on DateLore.` + hashtags.
- **Hashtag sets** per kind — default release set: `#OnThisDay #OnThisDayInHistory #PopCulture`.
- **Priority-date list** — 20–40 dates to seed/post first (holidays, high-search birthdays, big release anniversaries).

If findings differ from the defaults, record the chosen values here; Task 5 / Task 7 read these.

- [ ] **Step 3: Commit**

```bash
git add docs/pinterest-keyword-strategy.md
git commit -m "docs(pins): Pinterest keyword strategy (Phase 0)"
```

---

## Task 2: PinSpec type, validator, and allow-listed boards

**Files:**
- Create: `src/lib/pin-spec.ts`
- Test: `src/lib/pin-spec.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pin-spec.test.ts
import { describe, it, expect } from 'vitest';
import { validatePinSpec, ALLOWED_BOARDS } from './pin-spec';

const valid = {
  id: 'release', kind: 'release', board: 'Released On This Day',
  kicker: 'Released On This Day', title: 'Released on June 13',
  lines: ['2015 · Jurassic World'], hashtags: ['#OnThisDay'],
};

describe('validatePinSpec', () => {
  it('accepts a well-formed spec and returns it typed', () => {
    expect(validatePinSpec(valid, 'x.json').title).toBe('Released on June 13');
  });
  it('rejects a board not in ALLOWED_BOARDS', () => {
    expect(() => validatePinSpec({ ...valid, board: 'Random Board' }, 'x.json')).toThrow(/board/i);
  });
  it('rejects a reserved id that would collide with born/history images', () => {
    expect(() => validatePinSpec({ ...valid, id: 'born' }, 'x.json')).toThrow(/reserved/i);
  });
  it('rejects an id with illegal characters', () => {
    expect(() => validatePinSpec({ ...valid, id: 'My Pin!' }, 'x.json')).toThrow(/id/i);
  });
  it('rejects empty or >3 lines', () => {
    expect(() => validatePinSpec({ ...valid, lines: [] }, 'x.json')).toThrow(/lines/i);
    expect(() => validatePinSpec({ ...valid, lines: ['a', 'b', 'c', 'd'] }, 'x.json')).toThrow(/lines/i);
  });
  it('rejects an unknown kind', () => {
    expect(() => validatePinSpec({ ...valid, kind: 'banner' }, 'x.json')).toThrow(/kind/i);
  });
  it('exposes the three boards', () => {
    expect(ALLOWED_BOARDS).toContain('Born On This Day');
    expect(ALLOWED_BOARDS).toContain('On This Day in History');
    expect(ALLOWED_BOARDS).toContain('Released On This Day');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pin-spec.test.ts`
Expected: FAIL ("Cannot find module './pin-spec'").

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/pin-spec.ts
// One authored Pinterest pin, stored as src/data/pins/<MM>/<DD>/<id>.json. Validated at
// load time so a malformed file fails the build loudly rather than silently dropping a pin.
export type PinSpecKind = 'release' | 'birthday' | 'zodiac' | 'observance' | 'custom';

export const ALLOWED_BOARDS = ['Born On This Day', 'On This Day in History', 'Released On This Day'] as const;
export type Board = (typeof ALLOWED_BOARDS)[number];

const KINDS: PinSpecKind[] = ['release', 'birthday', 'zodiac', 'observance', 'custom'];
// 'born'/'history' are produced by the auto-generated pins and own the /pin/<day>-born.png
// and -history.png slugs; a folder pin must not reuse those ids.
const RESERVED_IDS = ['born', 'history'];

export interface PinSpec {
  id: string;            // unique within the day folder; [a-z0-9-]; drives the image slug suffix
  kind: PinSpecKind;
  board: Board;
  kicker: string;        // small uppercase eyebrow
  title: string;         // big serif headline
  lines: string[];       // 1–3 non-empty supporting lines
  hashtags?: string[];   // appended to the manifest description
  description?: string;  // optional override; default composed from lines + day context
  link?: string;         // site-relative path override; default the day page
  attribution?: string;  // source credit baked into the card
  enabled?: boolean;     // default true; false = skipped entirely
  generated?: boolean;   // true = written by the seeder (guards re-seed clobber)
}

function fail(where: string, msg: string): never {
  throw new Error(`Invalid pin spec (${where}): ${msg}`);
}

export function validatePinSpec(raw: unknown, where: string): PinSpec {
  if (typeof raw !== 'object' || raw === null) fail(where, 'not an object');
  const s = raw as Record<string, unknown>;

  if (typeof s.id !== 'string' || !/^[a-z0-9-]+$/.test(s.id)) fail(where, 'id must match /^[a-z0-9-]+$/');
  if (RESERVED_IDS.includes(s.id as string)) fail(where, `id "${s.id}" is reserved (born/history)`);
  if (!KINDS.includes(s.kind as PinSpecKind)) fail(where, `kind must be one of ${KINDS.join(', ')}`);
  if (!(ALLOWED_BOARDS as readonly string[]).includes(s.board as string)) fail(where, `board must be one of ${ALLOWED_BOARDS.join(' | ')}`);
  if (typeof s.kicker !== 'string' || !s.kicker.trim()) fail(where, 'kicker required');
  if (typeof s.title !== 'string' || !s.title.trim()) fail(where, 'title required');
  if (!Array.isArray(s.lines) || s.lines.length < 1 || s.lines.length > 3) fail(where, 'lines must have 1–3 entries');
  if (!s.lines.every((l) => typeof l === 'string' && l.trim().length > 0)) fail(where, 'every line must be a non-empty string');

  if (s.hashtags !== undefined && !(Array.isArray(s.hashtags) && s.hashtags.every((h) => typeof h === 'string'))) fail(where, 'hashtags must be string[]');
  for (const k of ['description', 'link', 'attribution'] as const) {
    if (s[k] !== undefined && typeof s[k] !== 'string') fail(where, `${k} must be a string`);
  }
  for (const k of ['enabled', 'generated'] as const) {
    if (s[k] !== undefined && typeof s[k] !== 'boolean') fail(where, `${k} must be a boolean`);
  }
  return s as unknown as PinSpec;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pin-spec.test.ts`
Expected: PASS (all 7).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pin-spec.ts src/lib/pin-spec.test.ts
git commit -m "feat(pins): PinSpec type + validator + allow-listed boards"
```

---

## Task 3: Generalize `pinDestination` to an arbitrary campaign

**Files:**
- Modify: `src/lib/utm.ts:33-43`
- Modify: `src/lib/utm.test.ts:21-28`
- Modify: `src/lib/pins-manifest.ts` (the two `pinDestination` calls)

- [ ] **Step 1: Update the test to the new signature (failing)**

Replace the `describe('pinDestination', ...)` block in `src/lib/utm.test.ts` with:

```ts
describe('pinDestination', () => {
  it('tags the day page with an arbitrary campaign', () => {
    expect(pinDestination('may-31', 'born-on')).toBe(
      `${SITE_ORIGIN}/may-31/?utm_source=pinterest&utm_medium=social&utm_campaign=born-on&utm_content=may-31`,
    );
    expect(pinDestination('may-31', 'released-on-this-day')).toContain('utm_campaign=released-on-this-day');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/utm.test.ts`
Expected: FAIL (type/arg mismatch — `'released-on-this-day'` is not assignable to `PinKind`).

- [ ] **Step 3: Generalize the function**

In `src/lib/utm.ts`, replace lines 33–43 (the `PinKind` type and `pinDestination`) with:

```ts
/** UTM'd destination for a pin: the day page, tagged by an arbitrary campaign. */
export function pinDestination(daySlug: string, campaign: string): string {
  return withUtm(`/${daySlug}/`, {
    source: 'pinterest',
    medium: 'social',
    campaign,
    content: daySlug,
  });
}
```

In `src/lib/pins-manifest.ts`, update the two calls: `pinDestination(slug, 'born')` → `pinDestination(slug, 'born-on')`, and `pinDestination(slug, 'history')` → `pinDestination(slug, 'on-this-day')`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/utm.test.ts`
Expected: PASS. (Manifest still compiles; born/history UTMs unchanged.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/utm.ts src/lib/utm.test.ts src/lib/pins-manifest.ts
git commit -m "refactor(pins): generalize pinDestination to an arbitrary campaign"
```

---

## Task 4: Pin-content loader and mappers

Widen `PinText.kind` first (folder pins use kinds beyond born/history; `pinTree` never branches on `kind`, so this is safe), then build the pure mappers + the build-only loader.

**Files:**
- Modify: `src/lib/pin-card.ts:27` (widen `PinText.kind`)
- Create: `src/lib/pin-content.ts`
- Test: `src/lib/pin-content.test.ts`

- [ ] **Step 1: Widen `PinText.kind`**

In `src/lib/pin-card.ts`, change the `PinText` interface field `kind: 'born' | 'history';` to `kind: string;`. (Leave `bornPin`/`historyPin` returning `'born'`/`'history'` — still valid strings.)

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/pin-content.test.ts
import { describe, it, expect } from 'vitest';
import { parseDayFromPinPath, campaignForKind, pinSpecToText, pinSpecToManifest, orderPinSpecs } from './pin-content';
import { SITE_ORIGIN } from './utm';
import type { PinSpec } from './pin-spec';

const spec: PinSpec = {
  id: 'release', kind: 'release', board: 'Released On This Day',
  kicker: 'Released On This Day', title: 'Released on June 13',
  lines: ['2015 · Jurassic World', '2017 · Get Out'], hashtags: ['#OnThisDay'],
};

describe('parseDayFromPinPath', () => {
  it('extracts mm/dd from a pin file path', () => {
    expect(parseDayFromPinPath('../data/pins/06/13/release.json')).toEqual({ mm: 6, dd: 13 });
  });
  it('returns null for a path without a valid MM/DD segment', () => {
    expect(parseDayFromPinPath('../data/pins/release.json')).toBeNull();
  });
});

describe('campaignForKind', () => {
  it('maps release to released-on-this-day', () => {
    expect(campaignForKind('release')).toBe('released-on-this-day');
  });
  it('namespaces other kinds', () => {
    expect(campaignForKind('zodiac')).toBe('pin-zodiac');
  });
});

describe('pinSpecToText', () => {
  it('maps a spec to PinText with the brand foot', () => {
    const t = pinSpecToText(spec);
    expect(t.title).toBe('Released on June 13');
    expect(t.lines).toHaveLength(2);
    expect(t.foot).toBe('datelore.com');
  });
});

describe('pinSpecToManifest', () => {
  const m = pinSpecToManifest(spec, 6, 13);
  it('builds a same-origin image slug from day + id', () => {
    expect(m.image).toBe(`${SITE_ORIGIN}/pin/june-13-release.png`);
  });
  it('uses the kind campaign in the UTM link', () => {
    expect(m.link).toContain('utm_campaign=released-on-this-day');
    expect(m.link).toContain('/june-13/');
  });
  it('appends hashtags to the composed description', () => {
    expect(m.description).toContain('Jurassic World');
    expect(m.description.trim().endsWith('#OnThisDay')).toBe(true);
  });
  it('honors a description override', () => {
    expect(pinSpecToManifest({ ...spec, description: 'Custom copy.' }, 6, 13).description).toContain('Custom copy.');
  });
});

describe('orderPinSpecs', () => {
  it('sorts by calendar date then id', () => {
    const a = { mm: 6, dd: 13, spec: { ...spec, id: 'b' } };
    const b = { mm: 1, dd: 2, spec: { ...spec, id: 'a' } };
    const c = { mm: 6, dd: 13, spec: { ...spec, id: 'a' } };
    expect(orderPinSpecs([a, b, c]).map((x) => x.spec.id)).toEqual(['a', 'a', 'b']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/pin-content.test.ts`
Expected: FAIL ("Cannot find module './pin-content'").

- [ ] **Step 4: Write the implementation**

```ts
// src/lib/pin-content.ts
// Loads authored pin specs from src/data/pins/<MM>/<DD>/*.json and maps each to the
// existing PinText (renderer) and PinManifestEntry (/pins.json). loadPinSpecs() uses
// Vite's import.meta.glob (build-only, like src/data/dates.ts); the pure mappers are
// unit-tested. Type-only import of PinManifestEntry avoids a runtime cycle with pins-manifest.
import type { PinSpec } from './pin-spec';
import { validatePinSpec } from './pin-spec';
import type { PinText } from './pin-card';
import type { PinManifestEntry } from './pins-manifest';
import { slugFromParts, monthName, dayOfYear } from './slug';
import { SITE_ORIGIN, pinDestination, withUtm } from './utm';

const FOOT = 'datelore.com';

export interface DayPinSpec { mm: number; dd: number; spec: PinSpec; }

export function parseDayFromPinPath(path: string): { mm: number; dd: number } | null {
  const m = path.match(/\/pins\/(\d{2})\/(\d{2})\//);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return { mm, dd };
}

export function campaignForKind(kind: string): string {
  return kind === 'release' ? 'released-on-this-day' : `pin-${kind}`;
}

export function pinSpecToText(spec: PinSpec): PinText {
  return { kind: spec.kind, kicker: spec.kicker, title: spec.title, lines: spec.lines, foot: FOOT, attribution: spec.attribution };
}

export function pinSpecToManifest(spec: PinSpec, mm: number, dd: number): PinManifestEntry {
  const daySlug = slugFromParts(mm, dd);
  const campaign = campaignForKind(spec.kind);
  const link = spec.link
    ? withUtm(spec.link, { source: 'pinterest', medium: 'social', campaign, content: daySlug })
    : pinDestination(daySlug, campaign);
  const base = spec.description ?? `${spec.lines.join(' · ')} — ${monthName(mm)} ${dd} on DateLore.`;
  const description = spec.hashtags?.length ? `${base} ${spec.hashtags.join(' ')}` : base;
  return {
    kind: spec.kind,
    day: daySlug,
    image: `${SITE_ORIGIN}/pin/${daySlug}-${spec.id}.png`,
    link,
    title: spec.title,
    description,
    board: spec.board,
  };
}

export function orderPinSpecs(items: DayPinSpec[]): DayPinSpec[] {
  return [...items].sort(
    (a, b) => dayOfYear(a.mm, a.dd) - dayOfYear(b.mm, b.dd) || a.spec.id.localeCompare(b.spec.id),
  );
}

/** Build-only: load + validate every authored pin spec. Skips enabled:false. */
export function loadPinSpecs(): DayPinSpec[] {
  const modules = import.meta.glob('../data/pins/**/*.json', { eager: true, import: 'default' });
  const out: DayPinSpec[] = [];
  for (const path in modules) {
    const day = parseDayFromPinPath(path);
    if (!day) throw new Error(`pin file with unparseable MM/DD path: ${path}`);
    const spec = validatePinSpec(modules[path], path);
    if (spec.enabled === false) continue;
    out.push({ mm: day.mm, dd: day.dd, spec });
  }
  return orderPinSpecs(out);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/pin-content.test.ts`
Expected: PASS (all groups).

- [ ] **Step 6: Commit**

```bash
git add src/lib/pin-card.ts src/lib/pin-content.ts src/lib/pin-content.test.ts
git commit -m "feat(pins): pin-content loader + spec-to-text/manifest mappers"
```

---

## Task 5: Release-pin generator

**Files:**
- Modify: `src/lib/pin-card.ts` (export `SENSITIVE`)
- Create: `src/lib/release-pin.ts`
- Test: `src/lib/release-pin.test.ts`

- [ ] **Step 1: Export `SENSITIVE`**

In `src/lib/pin-card.ts`, change `const SENSITIVE =` (line ~23) to `export const SENSITIVE =` (same regex).

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/release-pin.test.ts
import { describe, it, expect } from 'vitest';
import { releasePin, RELEASE_PIN_MIN_POP } from './release-pin';
import type { Release } from '../data/releases-types';

function rel(p: Partial<Release> & { title: string; date: string; popularity: number }): Release {
  return { id: `movie:test:${p.title}`, vertical: 'movie', meta: { vertical: 'movie' }, sourceUrl: 'https://x', ...p };
}

describe('releasePin', () => {
  it('returns null when no release clears the popularity floor', () => {
    expect(releasePin(6, 13, [rel({ title: 'Obscure', date: '2010-06-13', popularity: RELEASE_PIN_MIN_POP - 1 })])).toBeNull();
  });
  it('builds a release pin from the top notable anniversaries (year · title), newest first', () => {
    const p = releasePin(6, 13, [
      rel({ title: 'Get Out', date: '2017-06-13', popularity: 80 }),
      rel({ title: 'Jurassic World', date: '2015-06-13', popularity: 95 }),
    ])!;
    expect(p.id).toBe('release');
    expect(p.kind).toBe('release');
    expect(p.board).toBe('Released On This Day');
    expect(p.title).toBe('Released on June 13');
    expect(p.lines[0]).toBe('2015 · Jurassic World'); // popularity-sorted
    expect(p.generated).toBe(true);
  });
  it('caps to 3 lines', () => {
    const many = Array.from({ length: 6 }, (_, i) => rel({ title: `T${i}`, date: '2015-06-13', popularity: 90 - i }));
    expect(releasePin(6, 13, many)!.lines.length).toBe(3);
  });
  it('drops a release whose title trips the SENSITIVE filter', () => {
    const p = releasePin(6, 13, [
      rel({ title: 'The Massacre', date: '2016-06-13', popularity: 99 }),
      rel({ title: 'Inside Out', date: '2015-06-13', popularity: 88 }),
    ])!;
    expect(p.lines.join(' ')).toContain('Inside Out');
    expect(p.lines.join(' ').toLowerCase()).not.toContain('massacre');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/release-pin.test.ts`
Expected: FAIL ("Cannot find module './release-pin'").

- [ ] **Step 4: Write the implementation**

```ts
// src/lib/release-pin.ts
// Pure builder for the evergreen "Released on this day" pin, a sibling to bornPin/historyPin.
// Picks the most notable anniversary releases for a month-day and returns a PinSpec the seeder
// writes to src/data/pins/<MM>/<DD>/release.json. Returns null on a sparse day (no filler).
import type { Release } from '../data/releases-types';
import type { PinSpec } from './pin-spec';
import { SENSITIVE } from './pin-card';
import { monthName } from './slug';

// Notability floor on the 0..100 popularity score. Higher = fewer, bigger titles only.
// Tune for coverage vs. quality; the seeder reports how many days qualify.
export const RELEASE_PIN_MIN_POP = 50;
export const RELEASE_PIN_MAX_ITEMS = 3;

/** dayReleases = every release whose month-day matches (any year). */
export function releasePin(mm: number, dd: number, dayReleases: Release[]): PinSpec | null {
  const notable = dayReleases
    .filter((r) => r.popularity >= RELEASE_PIN_MIN_POP)
    .filter((r) => !SENSITIVE.test(r.title))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, RELEASE_PIN_MAX_ITEMS);
  if (notable.length === 0) return null;

  const lines = notable.map((r) => `${r.date.slice(0, 4)} · ${r.title}`);
  return {
    id: 'release',
    kind: 'release',
    board: 'Released On This Day',
    kicker: 'Released On This Day',
    title: `Released on ${monthName(mm)} ${dd}`,
    lines,
    hashtags: ['#OnThisDay', '#OnThisDayInHistory', '#PopCulture'],
    attribution: 'Sources: TMDB · IGDB · MusicBrainz',
    generated: true,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/release-pin.test.ts`
Expected: PASS (all 4).

- [ ] **Step 6: Commit**

```bash
git add src/lib/pin-card.ts src/lib/release-pin.ts src/lib/release-pin.test.ts
git commit -m "feat(pins): releasePin generator (evergreen released-on-this-day)"
```

---

## Task 6: Seed release pins into the folder

**Files:**
- Create: `scripts/seed-release-pins.ts`
- Modify: `package.json` (add `pins:seed`)
- Generated: `src/data/pins/<MM>/<DD>/release.json`

- [ ] **Step 1: Write the seeder**

```ts
// scripts/seed-release-pins.ts
// Writes one src/data/pins/<MM>/<DD>/release.json per qualifying day from the release
// calendar. Run via tsx (releases.ts uses static JSON imports, not import.meta.glob, so it
// works here). Modes: default = add-only (skip existing); --force = overwrite seeded files
// (generated:true) only; --force-all = overwrite everything including curated edits.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadReleases, releasesForDayPage } from '../src/lib/releases';
import { releasePin } from '../src/lib/release-pin';

const FORCE = process.argv.includes('--force');
const FORCE_ALL = process.argv.includes('--force-all');
const root = path.join(process.cwd(), 'src/data/pins');
const releases = loadReleases();

let written = 0, skipped = 0, sparse = 0;
for (let mm = 1; mm <= 12; mm++) {
  for (let dd = 1; dd <= 31; dd++) {
    const dayReleases = releasesForDayPage(releases, mm, dd).flatMap((g) => g.releases);
    const spec = releasePin(mm, dd, dayReleases);
    if (!spec) { sparse++; continue; }
    const dir = path.join(root, String(mm).padStart(2, '0'), String(dd).padStart(2, '0'));
    const file = path.join(dir, `${spec.id}.json`);
    if (existsSync(file) && !FORCE_ALL) {
      if (!FORCE) { skipped++; continue; }
      const cur = JSON.parse(readFileSync(file, 'utf8'));
      if (!cur.generated) { skipped++; continue; } // protect curated edits
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(spec, null, 2) + '\n');
    written++;
  }
}
console.log(`seed-release-pins: written ${written}, skipped ${skipped}, sparse(no-pin) ${sparse}`);
```

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, add: `"pins:seed": "tsx scripts/seed-release-pins.ts"`.

- [ ] **Step 3: Run the seeder**

Run: `npm run pins:seed`
Expected: prints `seed-release-pins: written N, skipped 0, sparse(no-pin) M` with N > 0 (qualifying days). If N seems too low/high for your taste, adjust `RELEASE_PIN_MIN_POP` in `src/lib/release-pin.ts` and re-run with `--force`.

- [ ] **Step 4: Spot-check one generated file**

Run: `npx vitest run src/lib/release-pin.test.ts` (still green) and open one generated `src/data/pins/**/release.json` to confirm shape (`id`, `kind: "release"`, `lines`, `generated: true`).

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-release-pins.ts package.json src/data/pins/
git commit -m "feat(pins): seed evergreen release pins into month/day folder"
```

---

## Task 7: Wire folder pins into the manifest + guard tests

**Files:**
- Modify: `src/lib/pins-manifest.ts` (append folder pins; widen `kind`)
- Test: `src/lib/pins-manifest.test.ts`

- [ ] **Step 1: Write the failing guard test**

```ts
// src/lib/pins-manifest.test.ts
import { describe, it, expect } from 'vitest';
import { buildPinManifest } from './pins-manifest';
import { ALLOWED_BOARDS } from './pin-spec';
import { fromSlug } from './slug';
import { SITE_ORIGIN } from './utm';
import { SENSITIVE } from './pin-card';

const pins = buildPinManifest();

describe('pin manifest guards (born + history + folder)', () => {
  it('includes the born/history baseline plus folder pins', () => {
    expect(pins.length).toBeGreaterThan(700);
  });
  it('includes the seeded release pins (this assertion is red before wiring)', () => {
    expect(pins.some((p) => p.board === 'Released On This Day')).toBe(true);
  });
  it('every image is same-origin under /pin/', () => {
    for (const p of pins) expect(p.image.startsWith(`${SITE_ORIGIN}/pin/`)).toBe(true);
  });
  it('every board is allow-listed', () => {
    const set = new Set<string>(ALLOWED_BOARDS);
    for (const p of pins) expect(set.has(p.board)).toBe(true);
  });
  it('every destination resolves to a real day slug (no dead links)', () => {
    for (const p of pins) expect(fromSlug(p.day)).not.toBeNull();
  });
  it('no pin title leads with a sensitive phrase', () => {
    for (const p of pins) expect(SENSITIVE.test(p.title)).toBe(false);
  });
  it('every title and description is non-empty', () => {
    for (const p of pins) {
      expect(p.title.trim().length).toBeGreaterThan(0);
      expect(p.description.trim().length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pins-manifest.test.ts`
Expected: FAIL — folder pins (release) are not yet in the manifest, so the count/board assertions fail (release board absent).

- [ ] **Step 3: Wire folder pins into `buildPinManifest`**

In `src/lib/pins-manifest.ts`:
1. Change the `PinManifestEntry` field `kind: 'born' | 'history';` to `kind: string;`.
2. Add imports at the top: `import { loadPinSpecs, pinSpecToManifest } from './pin-content';`
3. At the end of `buildPinManifest`, before `return pins;`, append:

```ts
  for (const { mm, dd, spec } of loadPinSpecs()) {
    pins.push(pinSpecToManifest(spec, mm, dd));
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pins-manifest.test.ts`
Expected: PASS (all 6).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS (all files green).

- [ ] **Step 6: Commit**

```bash
git add src/lib/pins-manifest.ts src/lib/pins-manifest.test.ts
git commit -m "feat(pins): fold folder pins into /pins.json manifest + guard tests"
```

---

## Task 8: Render folder pins as branded PNGs

Extract `pinTree` into its own module (reusable + testable), then source folder-pin `PinText` from the loader in the pin route.

**Files:**
- Create: `src/lib/pin-tree.ts`
- Test: `src/lib/pin-tree.test.ts`
- Modify: `src/pages/pin/[slug].png.ts`

- [ ] **Step 1: Extract `pinTree` into `src/lib/pin-tree.ts`**

Create `src/lib/pin-tree.ts` containing the exact `pinTree` function currently in `src/pages/pin/[slug].png.ts` (lines ~25-74), with imports moved over:

```ts
// src/lib/pin-tree.ts
// The Satori node tree for a vertical 1000×1500 pin. Extracted from the pin route so it can
// be reused (born/history + folder pins) and unit-tested. Pure: takes a PinText, returns a Node.
import { C, MARK_URI, box, img, type Node } from './og-brand';
import type { PinText } from './pin-card';

export function pinTree(pin: PinText): Node {
  return box(
    {
      width: '1000px', height: '1500px', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '92px 80px', backgroundColor: C.bg,
      backgroundImage: `linear-gradient(160deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      color: C.cream, fontFamily: 'Newsreader', position: 'relative',
    },
    [
      box({ position: 'absolute', top: '36px', left: '36px', width: '928px', height: '1428px', border: `2px solid ${C.border}`, borderRadius: '24px' }),
      box({ display: 'flex', alignItems: 'center' }, [
        img(MARK_URI, 72),
        box({ display: 'flex', fontSize: '52px', fontWeight: 600, color: C.cream, marginLeft: '20px' }, 'DateLore'),
      ]),
      box({ display: 'flex', flexDirection: 'column' }, [
        box({ display: 'flex', fontSize: '34px', letterSpacing: '8px', color: C.gold, fontWeight: 600 }, pin.kicker.toUpperCase()),
        box({ display: 'flex', fontSize: '96px', fontWeight: 600, lineHeight: 1.04, marginTop: '22px' }, pin.title),
        box(
          { display: 'flex', flexDirection: 'column', marginTop: '44px' },
          pin.lines.map((l) => box({ display: 'flex', fontSize: '44px', color: C.sub, lineHeight: 1.3, marginTop: '18px' }, l)),
        ),
      ]),
      box({ display: 'flex', flexDirection: 'column' }, [
        ...(pin.attribution ? [box({ display: 'flex', fontSize: '24px', color: C.sub, marginBottom: '16px' }, pin.attribution)] : []),
        box({ display: 'flex', fontSize: '30px', letterSpacing: '6px', color: C.gold }, pin.foot.toUpperCase()),
      ]),
    ],
  );
}
```

- [ ] **Step 2: Write the failing render test**

```ts
// src/lib/pin-tree.test.ts
import { describe, it, expect } from 'vitest';
import { pinTree } from './pin-tree';
import { renderPng } from './og-brand';
import { pinSpecToText } from './pin-content';
import type { PinSpec } from './pin-spec';

const spec: PinSpec = {
  id: 'release', kind: 'release', board: 'Released On This Day',
  kicker: 'Released On This Day', title: 'Released on June 13',
  lines: ['2015 · Jurassic World'], attribution: 'Sources: TMDB · IGDB · MusicBrainz',
};

describe('pinTree rendering', () => {
  it('renders a folder pin to a valid PNG buffer', async () => {
    const png = await renderPng(pinTree(pinSpecToText(spec)), 1000, 1500);
    expect(png.subarray(0, 4).toString('hex')).toBe('89504e47'); // PNG magic
    expect(png.length).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/pin-tree.test.ts`
Expected: FAIL ("Cannot find module './pin-tree'").

- [ ] **Step 4: Update the pin route to use the module + render folder pins**

In `src/pages/pin/[slug].png.ts`:
1. Delete the local `pinTree` function (lines ~25-74).
2. Replace the entire top import block (every `import` line above `getStaticPaths`) with exactly:

```ts
import type { APIRoute } from 'astro';
import { DATES } from '../../data/dates.js';
import { toSlug, monthName, slugFromParts } from '../../lib/slug';
import { renderPng } from '../../lib/og-brand';
import { bornPin, historyPin } from '../../lib/pin-card';
import { pinTree } from '../../lib/pin-tree';
import { loadPinSpecs, pinSpecToText } from '../../lib/pin-content';
import type { PinSpec } from '../../lib/pin-spec';
```

3. Replace `getStaticPaths` and the props type:

```ts
type PinProps = { kind: 'born' | 'history'; key: string } | { kind: 'folder'; spec: PinSpec };

export function getStaticPaths() {
  const paths: { params: { slug: string }; props: PinProps }[] = [];
  for (const key of Object.keys(DATES)) {
    const slug = toSlug(key);
    paths.push({ params: { slug: `${slug}-born` }, props: { kind: 'born', key } });
    paths.push({ params: { slug: `${slug}-history` }, props: { kind: 'history', key } });
  }
  for (const { mm, dd, spec } of loadPinSpecs()) {
    paths.push({ params: { slug: `${slugFromParts(mm, dd)}-${spec.id}` }, props: { kind: 'folder', spec } });
  }
  return paths;
}
```

4. Replace the `GET` body's pin derivation:

```ts
export const GET: APIRoute = async ({ props }) => {
  const p = props as PinProps;
  let pin;
  if (p.kind === 'folder') {
    pin = pinSpecToText(p.spec);
  } else {
    const [mm, dd] = p.key.split('-').map(Number);
    const entry = DATES[p.key];
    pin = p.kind === 'born' ? bornPin(monthName(mm), mm, dd, entry) : historyPin(monthName(mm), dd, entry);
  }
  const png = await renderPng(pinTree(pin), 1000, 1500);
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
```

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run src/lib/pin-tree.test.ts`
Expected: PASS.
Run: `npm test`
Expected: PASS (full suite).

- [ ] **Step 6: Commit**

```bash
git add src/lib/pin-tree.ts src/lib/pin-tree.test.ts src/pages/pin/[slug].png.ts
git commit -m "feat(pins): render folder pins (extract pinTree, add folder paths)"
```

---

## Task 9: Manual posting-queue page + docs

**Files:**
- Create: `src/pages/pins/index.astro`
- Create: `docs/daily-pins.md`

- [ ] **Step 1: Create the posting-queue page**

```astro
---
// src/pages/pins/index.astro — internal manual-posting queue (noindex). Reads the same
// manifest as /pins.json and groups pins by board so the owner can copy fields in one place.
import { buildPinManifest } from '../../lib/pins-manifest';

const pins = buildPinManifest();
const byBoard: Record<string, typeof pins> = {};
for (const p of pins) (byBoard[p.board] ??= []).push(p);
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Pin posting queue — DateLore</title>
    <style>
      body { font: 15px/1.5 system-ui, sans-serif; margin: 2rem; color: #1d0f17; }
      h1 { margin-bottom: 0.25rem; }
      h2 { margin-top: 2rem; border-bottom: 2px solid #d8a23f; padding-bottom: 0.25rem; }
      .pin { display: grid; grid-template-columns: 120px 1fr; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #eee; }
      .pin img { width: 120px; height: 180px; object-fit: cover; border-radius: 8px; }
      .pin h3 { margin: 0 0 0.25rem; }
      .pin p { margin: 0.25rem 0; }
      .pin a { color: #9a6b1f; word-break: break-all; }
      code { background: #f4efe6; padding: 0 0.25rem; }
    </style>
  </head>
  <body>
    <h1>Pin posting queue</h1>
    <p>{pins.length} pins. Internal tool (noindex). Post each to its board; copy the title, description, and destination link.</p>
    {Object.entries(byBoard).map(([board, list]) => (
      <section>
        <h2>{board} ({list.length})</h2>
        {list.map((p) => (
          <div class="pin">
            <img src={p.image} alt={p.title} loading="lazy" />
            <div>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <p>Link: <a href={p.link}>{p.link}</a></p>
              <p>Image: <code>{p.image}</code></p>
            </div>
          </div>
        ))}
      </section>
    ))}
  </body>
</html>
```

- [ ] **Step 2: Write the authoring + posting docs**

```markdown
<!-- docs/daily-pins.md -->
# DateLore Daily Pins — authoring & manual posting

## What this is
Born/history pins generate automatically. Extra pins (starting with the evergreen
"Released on this day") live as JSON files under `src/data/pins/<MM>/<DD>/<id>.json` and
flow into `/pins.json` and the `/pins/` posting queue.

## Add a pin by hand
1. Create `src/data/pins/<MM>/<DD>/<id>.json` (zero-padded month/day). Example:
   ```json
   { "id": "birthday-spotlight", "kind": "birthday", "board": "Born On This Day",
     "kicker": "Born On This Day", "title": "Famous June 13 Birthdays",
     "lines": ["James Clerk Maxwell (1831)", "Ban Ki-moon (1944)"],
     "hashtags": ["#Birthday", "#OnThisDay"] }
   ```
   - `id` is `[a-z0-9-]`, unique per day, and must not be `born`/`history`.
   - `board` must be one of: `Born On This Day`, `On This Day in History`, `Released On This Day`.
   - 1–3 `lines`. `enabled: false` hides a pin without deleting it.
2. The build renders `/pin/<month>-<day>-<id>.png` and adds it to `/pins.json` and `/pins/`.

## Post (manual mode, current)
1. Open `/pins/` (or `/pins.json`).
2. For each pin: upload its image, paste the title + description, set the destination link,
   choose the board. Start with the priority dates in `docs/pinterest-keyword-strategy.md`.
3. Boards must exist on Pinterest first (create "Released On This Day" by hand).

> Video pins: upload the MP4 by hand in Pinterest's UI — no API or Standard access needed.

## Re-seed release pins
- `npm run pins:seed` — add-only (won't touch existing files).
- `npm run pins:seed -- --force` — refresh seeded (`generated:true`) files; leaves curated edits.
- `npm run pins:seed -- --force-all` — overwrite everything (escape hatch).

## Automation (later)
The auto-poster (`scripts/post-to-pinterest.ts` + `.github/workflows/pinterest.yml`) is built
but dormant; it reads the same `/pins.json` and resumes once Pinterest Standard access is granted.
```

- [ ] **Step 3: Verify the page builds (route check)**

Run: `npx astro check 2>&1 | head -20` (or proceed to the full build in Task 10).
Confirm no route collision warning between `pins.json.ts` and `pins/index.astro`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/pins/index.astro docs/daily-pins.md
git commit -m "feat(pins): manual posting-queue page + daily-pins docs"
```

---

## Task 10: Full build + suite verification

**Files:** none (verification + final commit if anything regenerated).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — all `*.test.ts` green.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds (it is slow, ~7–10 min, because of the pin PNGs — this is known). No errors.

- [ ] **Step 3: Verify folder pins rendered + are in the manifest**

Run:
```bash
ls dist/pins/index.html
ls dist/pin/*-release.png | head
node -e "const m=require('./dist/pins.json'); const r=m.pins.filter(p=>p.board==='Released On This Day'); console.log('release pins:', r.length); console.log(r[0])"
```
Expected: `dist/pins/index.html` exists; several `*-release.png` files exist; the manifest lists "Released On This Day" pins with non-empty title/description and a `utm_campaign=released-on-this-day` link.

- [ ] **Step 4: Final commit (if anything changed)**

```bash
git add -A
git commit -m "chore(pins): verify daily-pin engine build" --allow-empty
```

---

## Notes for the executor

- **Run order matters:** Tasks 2→8 have compile-time dependencies (pin-spec → utm → pin-content → release-pin → seeder → manifest → render). Do them in order.
- **`import.meta.glob` is build/Vitest-only.** Anything importing `pin-content`/`pins-manifest` at runtime under plain `tsx` (e.g. the poster) must use `import type` only — the poster already does. Do not import `buildPinManifest` into `scripts/*`.
- **Notability tuning** (`RELEASE_PIN_MIN_POP`) is the one knob to revisit after seeing the seeder's `written/sparse` counts; re-seed with `--force`.
- **Phase 0** (Task 1) can run anytime before launch; the code ships with working defaults it may refine.
