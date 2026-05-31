# DateLore Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the approved DateLore visual design into the real root project as a running, deployable Astro site whose interactive logic lives in a unit-tested pure-TypeScript core, wired to a typed sample dataset.

**Architecture:** Astro static site (no UI framework). All *computation* (zodiac/generation/birthstone lookups, birthday math, daily-quiz selection, slug ↔ date mapping) lives in pure, `now`-injected TypeScript modules under `src/lib/` and is unit-tested with Vitest. Astro pages and one thin vanilla client script (`src/scripts/datelore.ts`) consume those same pure functions — the client at runtime, the pages at build time. Day pages are a single dynamic route `src/pages/[slug].astro` over the dataset, using readable root slugs (`/may-31`) per spec §5.1. Derived facts (day-of-year, zodiac, birthstone, birth flower) are **computed from the date**, not stored per entry, so the dataset holds only editorial content.

**Tech Stack:** Astro 5 (static, `build.format: 'directory'`), TypeScript, Vitest, vanilla DOM JS. Hosting: Cloudflare static-assets Worker (existing `wrangler.jsonc`). Out of scope here (later plans): the Wikimedia 366-date data pipeline, JSON-LD, OG/share image generation, sitemap, Ezoic ads.

**Scope note — what "Foundation" deliberately excludes (deferred to later plans):**
- Real 366-date data + the Wikimedia fetch/transform pipeline (this plan ships the 4 curated sample dates only).
- JSON-LD structured data, per-day OG/share PNG generation, sitemap.
- Ezoic ad **loader** (ad *slot markup* is ported as static placeholders, no network loader).
- Full client-side rendering of *today's* day content on the homepage (Foundation personalizes the homepage's date label + deep links to today; the spotlight teaser content is a server-rendered feature date). Reason: rendering arbitrary day content client-side is only worthwhile once the 366-date dataset exists.

**Design source of truth (for verbatim/near-verbatim ports):**
`design/hey-im-got-a-new-website-i-need/astro-site/` (referred to below as `<DESIGN>`). This folder is untracked and stays in place; this plan only writes into the root project.

---

## File Structure

**Created (pure TS core + tests):**
- `src/lib/slug.ts` — month/day ↔ slug ↔ data-key mapping, day-of-year, ordinal, date-sort. One responsibility: calendar/URL math.
- `src/lib/slug.test.ts`
- `src/lib/reference.ts` — typed reference tables: zodiac (sign+glyph by date), Chinese zodiac (by year), generation (by year), birthstone & birth flower (by month).
- `src/lib/reference.test.ts`
- `src/lib/birthday.ts` — `parseBirthdate` + pure `computeBirthday(input, now)` → typed stats.
- `src/lib/birthday.test.ts`
- `src/lib/quiz.ts` — `seedFromDateUTC`, `pickQuiz(events, seed)`, `selectQuizForToday(pool, refDate)`.
- `src/lib/quiz.test.ts`
- `src/data/dates.ts` — typed dataset (`DayEntry` interface, `DATES` record) — editorial content only.
- `src/data/dates.test.ts` — data-integrity guard.

**Created (UI):**
- `src/styles/global.css` — verbatim copy of `<DESIGN>/src/styles/global.css` (the design system).
- `src/scripts/datelore.ts` — thin client wiring that imports the pure core.
- `src/layouts/BaseLayout.astro`
- `src/components/Header.astro`
- `src/components/Footer.astro`
- `src/pages/[slug].astro` — the 366-day route (4 pages from the sample data).
- `src/pages/birthday.astro`
- `src/pages/quiz.astro`
- `src/pages/share.astro`
- `vitest.config.ts`

**Modified:**
- `package.json` — add `vitest` devDep + test scripts.
- `astro.config.mjs` — add `build: { format: 'directory' }`.
- `src/pages/index.astro` — replace the placeholder homepage.
- `README.md` — update the Status line.

**Untouched:** `tsconfig.json` (already extends `astro/tsconfigs/strict`), `wrangler.jsonc`, `.gitignore`.

---

## Task 0: Project configuration

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`
- Create: `vitest.config.ts`
- Create: `src/styles/global.css` (copied)

- [ ] **Step 1: Add Vitest + test scripts to `package.json`**

Replace the file with:

```json
{
  "name": "datelore",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: completes, `node_modules/vitest` exists.

- [ ] **Step 3: Set Astro to directory-format output**

Replace `astro.config.mjs` with:

```js
import { defineConfig } from 'astro/config';

// DateLore — static site. https://datelore.com
// `format: 'directory'` gives clean trailing-slash URLs like /may-31/ which are
// friendlier for SEO + ad crawlers.
export default defineConfig({
  site: 'https://datelore.com',
  build: { format: 'directory' },
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 5: Copy the design system stylesheet verbatim**

This file is a verbatim port (the design README states `global.css` mirrors the prototype `styles.css`). Copy it; do not hand-edit.

PowerShell:
```powershell
New-Item -ItemType Directory -Force src\styles | Out-Null
Copy-Item "design\hey-im-got-a-new-website-i-need\astro-site\src\styles\global.css" "src\styles\global.css"
```

Verify: `src/styles/global.css` exists and starts with `/* ===` ... `DateLore — "The Almanac" visual system`.

- [ ] **Step 6: Sanity-check the test runner with an empty pass**

Run: `npm run test`
Expected: Vitest runs and reports `No test files found` (exit 0 is fine) — confirms Vitest is wired before any tests exist. (If your Vitest version exits non-zero on no files, proceed; Task 1 adds the first test.)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json astro.config.mjs vitest.config.ts src/styles/global.css
git commit -m "chore: add Vitest, directory URLs, and port design-system CSS"
```

---

## Task 1: Slug & calendar math (`src/lib/slug.ts`)

**Files:**
- Create: `src/lib/slug.ts`
- Test: `src/lib/slug.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/slug.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  toSlug, slugFromParts, fromSlug, monthName, dayOfYear, ordinal, sortKeysByDate,
} from './slug';

describe('toSlug / fromSlug', () => {
  it('maps data keys to readable slugs', () => {
    expect(toSlug('05-31')).toBe('may-31');
    expect(toSlug('12-25')).toBe('december-25');
    expect(toSlug('07-04')).toBe('july-4');
    expect(toSlug('01-01')).toBe('january-1');
  });

  it('slugFromParts builds the same slug', () => {
    expect(slugFromParts(5, 31)).toBe('may-31');
  });

  it('round-trips back to the zero-padded key', () => {
    for (const key of ['01-01', '05-31', '07-04', '12-25', '02-29']) {
      expect(fromSlug(toSlug(key))).toBe(key);
    }
  });

  it('rejects impossible or malformed slugs', () => {
    expect(fromSlug('may-99')).toBeNull();
    expect(fromSlug('smarch-3')).toBeNull();
    expect(fromSlug('june-31')).toBeNull(); // June has 30 days
    expect(fromSlug('birthday')).toBeNull();
  });
});

describe('dayOfYear (non-leap counting)', () => {
  it('matches known ordinals', () => {
    expect(dayOfYear(1, 1)).toBe(1);
    expect(dayOfYear(5, 31)).toBe(151);
    expect(dayOfYear(7, 4)).toBe(185);
    expect(dayOfYear(12, 25)).toBe(359);
  });
});

describe('ordinal', () => {
  it('adds correct suffixes', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(151)).toBe('151st');
  });
});

describe('sortKeysByDate', () => {
  it('orders keys by calendar position', () => {
    expect(sortKeysByDate(['12-25', '01-01', '07-04', '05-31']))
      .toEqual(['01-01', '05-31', '07-04', '12-25']);
  });
});

describe('monthName', () => {
  it('returns the full month name', () => {
    expect(monthName(5)).toBe('May');
    expect(monthName(12)).toBe('December');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test -- slug`
Expected: FAIL — `Cannot find module './slug'` / exports undefined.

- [ ] **Step 3: Write the minimal implementation**

`src/lib/slug.ts`:

```ts
// Pure helpers mapping between "MM-DD" data keys and readable URL slugs, plus
// the calendar math the day pages need. No DOM, no Astro — fully unit-tested.

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const MONTH_SLUGS = MONTHS.map((m) => m.toLowerCase());

// Days per month for a NON-leap year (index 0 = January).
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** "05-31" -> "may-31" (the canonical URL slug, spec §5.1). */
export function toSlug(key: string): string {
  const [mm, dd] = key.split('-');
  return `${MONTH_SLUGS[parseInt(mm, 10) - 1]}-${parseInt(dd, 10)}`;
}

/** Build a slug straight from numbers, e.g. slugFromParts(5, 31) -> "may-31". */
export function slugFromParts(month: number, day: number): string {
  return `${MONTH_SLUGS[month - 1]}-${day}`;
}

/** "may-31" -> "05-31" (zero-padded data key), or null if not a real date. */
export function fromSlug(slug: string): string | null {
  const idx = slug.lastIndexOf('-');
  if (idx < 0) return null;
  const month = MONTH_SLUGS.indexOf(slug.slice(0, idx)) + 1;
  const day = parseInt(slug.slice(idx + 1), 10);
  if (month < 1 || !Number.isInteger(day) || day < 1) return null;
  const max = month === 2 ? 29 : DAYS_IN_MONTH[month - 1]; // allow Feb 29
  if (day > max) return null;
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function monthName(month: number): string {
  return MONTHS[month - 1];
}

/** Ordinal day-of-year using NON-leap counting; Feb 29 resolves to 60. */
export function dayOfYear(month: number, day: number): number {
  let total = day;
  for (let m = 0; m < month - 1; m++) total += DAYS_IN_MONTH[m];
  return total;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Sort "MM-DD" keys into calendar order. */
export function sortKeysByDate(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const [am, ad] = a.split('-').map(Number);
    const [bm, bd] = b.split('-').map(Number);
    return dayOfYear(am, ad) - dayOfYear(bm, bd);
  });
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run test -- slug`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/slug.ts src/lib/slug.test.ts
git commit -m "feat(core): slug/date math with tests"
```

---

## Task 2: Reference tables (`src/lib/reference.ts`)

**Files:**
- Create: `src/lib/reference.ts`
- Test: `src/lib/reference.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/reference.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  zodiacForDate, chineseZodiacForYear, generationForYear,
  birthstoneForMonth, birthFlowerForMonth,
} from './reference';

describe('zodiacForDate', () => {
  it('returns the western sign + glyph for a date', () => {
    expect(zodiacForDate(5, 31)).toEqual({ sign: 'Gemini', glyph: '♊' });
    expect(zodiacForDate(7, 4)).toEqual({ sign: 'Cancer', glyph: '♋' });
    expect(zodiacForDate(1, 1)).toEqual({ sign: 'Capricorn', glyph: '♑' });
    expect(zodiacForDate(12, 25)).toEqual({ sign: 'Capricorn', glyph: '♑' });
  });

  it('handles the boundary days', () => {
    expect(zodiacForDate(5, 20).sign).toBe('Taurus');
    expect(zodiacForDate(5, 21).sign).toBe('Gemini');
  });
});

describe('chineseZodiacForYear', () => {
  it('maps years to animals', () => {
    expect(chineseZodiacForYear(1990)).toBe('Horse');
    expect(chineseZodiacForYear(2000)).toBe('Dragon');
  });
});

describe('generationForYear', () => {
  it('labels generations by birth year', () => {
    expect(generationForYear(1955)).toBe('Baby Boomer');
    expect(generationForYear(1975)).toBe('Generation X');
    expect(generationForYear(1990)).toBe('Millennial');
    expect(generationForYear(2005)).toBe('Generation Z');
    expect(generationForYear(2015)).toBe('Generation Alpha');
  });
});

describe('birthstone / birth flower by month', () => {
  it('matches the curated sample dates', () => {
    expect(birthstoneForMonth(5)).toBe('Emerald');
    expect(birthstoneForMonth(1)).toBe('Garnet');
    expect(birthstoneForMonth(7)).toBe('Ruby');
    expect(birthstoneForMonth(12)).toBe('Turquoise');
    expect(birthFlowerForMonth(5)).toBe('Lily of the Valley');
    expect(birthFlowerForMonth(7)).toBe('Larkspur');
    expect(birthFlowerForMonth(12)).toBe('Holly');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test -- reference`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

`src/lib/reference.ts`:

```ts
// Typed reference tables — DateLore's own hand-authored data (not from
// Wikimedia). Pure lookups, unit-tested.

export interface Zodiac { sign: string; glyph: string; }

const ZODIAC: { sign: string; glyph: string; from: [number, number]; to: [number, number] }[] = [
  { sign: 'Capricorn',   glyph: '♑', from: [12, 22], to: [1, 19] },
  { sign: 'Aquarius',    glyph: '♒', from: [1, 20],  to: [2, 18] },
  { sign: 'Pisces',      glyph: '♓', from: [2, 19],  to: [3, 20] },
  { sign: 'Aries',       glyph: '♈', from: [3, 21],  to: [4, 19] },
  { sign: 'Taurus',      glyph: '♉', from: [4, 20],  to: [5, 20] },
  { sign: 'Gemini',      glyph: '♊', from: [5, 21],  to: [6, 20] },
  { sign: 'Cancer',      glyph: '♋', from: [6, 21],  to: [7, 22] },
  { sign: 'Leo',         glyph: '♌', from: [7, 23],  to: [8, 22] },
  { sign: 'Virgo',       glyph: '♍', from: [8, 23],  to: [9, 22] },
  { sign: 'Libra',       glyph: '♎', from: [9, 23],  to: [10, 22] },
  { sign: 'Scorpio',     glyph: '♏', from: [10, 23], to: [11, 21] },
  { sign: 'Sagittarius', glyph: '♐', from: [11, 22], to: [12, 21] },
];

export function zodiacForDate(month: number, day: number): Zodiac {
  for (const z of ZODIAC) {
    if ((month === z.from[0] && day >= z.from[1]) ||
        (month === z.to[0] && day <= z.to[1])) {
      return { sign: z.sign, glyph: z.glyph };
    }
  }
  return { sign: ZODIAC[0].sign, glyph: ZODIAC[0].glyph }; // Capricorn fallback
}

const CHINESE = ['Monkey', 'Rooster', 'Dog', 'Pig', 'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat'];
export function chineseZodiacForYear(year: number): string {
  return CHINESE[((year % 12) + 12) % 12];
}

export function generationForYear(year: number): string {
  if (year <= 1927) return 'Greatest Generation';
  if (year <= 1945) return 'Silent Generation';
  if (year <= 1964) return 'Baby Boomer';
  if (year <= 1980) return 'Generation X';
  if (year <= 1996) return 'Millennial';
  if (year <= 2012) return 'Generation Z';
  return 'Generation Alpha';
}

const BIRTHSTONES = ['Garnet', 'Amethyst', 'Aquamarine', 'Diamond', 'Emerald', 'Pearl', 'Ruby', 'Peridot', 'Sapphire', 'Opal', 'Topaz', 'Turquoise'];
export function birthstoneForMonth(month: number): string { return BIRTHSTONES[month - 1]; }

const BIRTH_FLOWERS = ['Carnation', 'Violet', 'Daffodil', 'Daisy', 'Lily of the Valley', 'Rose', 'Larkspur', 'Gladiolus', 'Aster', 'Marigold', 'Chrysanthemum', 'Holly'];
export function birthFlowerForMonth(month: number): string { return BIRTH_FLOWERS[month - 1]; }
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run test -- reference`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reference.ts src/lib/reference.test.ts
git commit -m "feat(core): zodiac/generation/birthstone reference tables with tests"
```

---

## Task 3: Birthday math (`src/lib/birthday.ts`)

**Files:**
- Create: `src/lib/birthday.ts`
- Test: `src/lib/birthday.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/birthday.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseBirthdate, computeBirthday } from './birthday';

describe('parseBirthdate', () => {
  it('parses a valid ISO date', () => {
    expect(parseBirthdate('1990-05-31')).toEqual({ year: 1990, month: 5, day: 31 });
  });
  it('accepts a real leap day', () => {
    expect(parseBirthdate('2000-02-29')).toEqual({ year: 2000, month: 2, day: 29 });
  });
  it('rejects a non-existent date', () => {
    expect(parseBirthdate('2001-02-29')).toBeNull(); // 2001 is not a leap year
    expect(parseBirthdate('1990-13-01')).toBeNull();
    expect(parseBirthdate('not-a-date')).toBeNull();
  });
});

describe('computeBirthday', () => {
  const now = new Date(2026, 5, 1); // June 1, 2026 (local)

  it('computes a full, correct card', () => {
    const stats = computeBirthday({ year: 1990, month: 5, day: 31 }, now)!;
    expect(stats).not.toBeNull();
    expect(stats.years).toBe(36);
    expect(stats.weekday).toBe('Thursday'); // May 31, 1990 was a Thursday
    expect(stats.zodiac).toBe('♊ Gemini');
    expect(stats.chinese).toBe('Year of the Horse');
    expect(stats.generation).toBe('Millennial');
    expect(stats.pretty).toBe('May 31st, 1990');
    expect(stats.totalDays).toBeGreaterThan(13000);
    expect(stats.daysToNext).toBeGreaterThanOrEqual(0);
    expect(stats.daysToNext).toBeLessThanOrEqual(366);
  });

  it('returns null for a future birthdate', () => {
    expect(computeBirthday({ year: 2030, month: 1, day: 1 }, now)).toBeNull();
  });

  it('does not over-count age before the birthday lands this year', () => {
    const early = new Date(2026, 0, 1); // Jan 1, 2026
    expect(computeBirthday({ year: 1990, month: 5, day: 31 }, early)!.years).toBe(35);
  });

  it('handles a Feb-29 birthday without crashing', () => {
    const stats = computeBirthday({ year: 2000, month: 2, day: 29 }, now)!;
    expect(stats.weekday).toBeTruthy();
    expect(stats.daysToNext).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test -- birthday`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

`src/lib/birthday.ts`:

```ts
import { zodiacForDate, chineseZodiacForYear, generationForYear } from './reference';
import { ordinal, monthName } from './slug';

export interface BirthdayInput { year: number; month: number; day: number; } // month 1-12
export interface BirthdayStats {
  years: number;
  totalDays: number;
  totalHours: number;
  weekday: string;
  zodiac: string;      // "♊ Gemini"
  chinese: string;     // "Year of the Horse"
  generation: string;
  daysToNext: number;  // 0 == today
  pretty: string;      // "May 31st, 1990"
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Parse "YYYY-MM-DD" -> BirthdayInput, or null if malformed / not a real date. */
export function parseBirthdate(value: string): BirthdayInput | null {
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const year = +parts[0], month = +parts[1], day = +parts[2];
  if (![year, month, day].every(Number.isInteger)) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return { year, month, day };
}

/**
 * Pure birthday math. `now` is injected so the function is deterministic and
 * unit-testable. Returns null if the birthdate is in the future.
 */
export function computeBirthday(input: BirthdayInput, now: Date): BirthdayStats | null {
  const birth = new Date(input.year, input.month - 1, input.day);
  if (birth.getTime() > now.getTime()) return null;

  let years = now.getFullYear() - input.year;
  const hadBirthday =
    now.getMonth() > input.month - 1 ||
    (now.getMonth() === input.month - 1 && now.getDate() >= input.day);
  if (!hadBirthday) years--;

  const ms = now.getTime() - birth.getTime();
  const totalDays = Math.floor(ms / 86_400_000);
  const totalHours = Math.floor(ms / 3_600_000);

  // Next birthday. JS rolls Feb 29 to Mar 1 in common years, which is fine.
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), input.month - 1, input.day);
  if (next.getTime() < todayMidnight.getTime()) {
    next = new Date(now.getFullYear() + 1, input.month - 1, input.day);
  }
  const daysToNext = Math.round((next.getTime() - todayMidnight.getTime()) / 86_400_000);

  const z = zodiacForDate(input.month, input.day);

  return {
    years,
    totalDays,
    totalHours,
    weekday: WEEKDAYS[birth.getDay()],
    zodiac: `${z.glyph} ${z.sign}`,
    chinese: `Year of the ${chineseZodiacForYear(input.year)}`,
    generation: generationForYear(input.year),
    daysToNext,
    pretty: `${monthName(input.month)} ${ordinal(input.day)}, ${input.year}`,
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run test -- birthday`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/birthday.ts src/lib/birthday.test.ts
git commit -m "feat(core): deterministic birthday math with tests"
```

---

## Task 4: Daily quiz selection (`src/lib/quiz.ts`)

**Files:**
- Create: `src/lib/quiz.ts`
- Test: `src/lib/quiz.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/quiz.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { seedFromDateUTC, pickQuiz, selectQuizForToday, type QuizEvent } from './quiz';

const EVENTS: QuizEvent[] = [
  { year: 1911, title: 'The Titanic is launched' },
  { year: 1859, title: 'Big Ben begins keeping time' },
];

describe('seedFromDateUTC', () => {
  it('is stable for the same UTC calendar day', () => {
    const a = seedFromDateUTC(new Date(Date.UTC(2026, 4, 31, 1, 0)));
    const b = seedFromDateUTC(new Date(Date.UTC(2026, 4, 31, 23, 0)));
    expect(a).toBe(b);
    expect(seedFromDateUTC(new Date(Date.UTC(2026, 5, 1)))).toBe(a + 1);
  });
});

describe('pickQuiz', () => {
  it('is deterministic for a given seed', () => {
    const q1 = pickQuiz(EVENTS, 1234);
    const q2 = pickQuiz(EVENTS, 1234);
    expect(q1).toEqual(q2);
  });

  it('produces 4 distinct options including the correct year', () => {
    const q = pickQuiz(EVENTS, 999);
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain(q.answerYear);
    expect(q.options[q.correctIndex]).toBe(q.answerYear);
  });
});

describe('selectQuizForToday', () => {
  const pool: Record<string, QuizEvent[]> = {
    '05-31': EVENTS,
    '12-25': [{ year: 800, title: 'Charlemagne is crowned emperor' }],
  };

  it("uses today's events when the date is present", () => {
    const q = selectQuizForToday(pool, new Date(Date.UTC(2026, 4, 31)));
    expect([1911, 1859]).toContain(q.answerYear);
  });

  it('falls back to an available date when today is missing', () => {
    const q = selectQuizForToday(pool, new Date(Date.UTC(2026, 2, 15))); // Mar 15, absent
    expect(q.options).toHaveLength(4);
    expect(q.answerYear).toBeGreaterThan(0);
  });

  it('throws only when the pool is entirely empty', () => {
    expect(() => selectQuizForToday({}, new Date())).toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test -- quiz`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

`src/lib/quiz.ts`:

```ts
// Deterministic "which year did it happen?" daily quiz. Same UTC day -> same
// puzzle for everyone (spec §8). Pure + unit-tested; reused by the client.

export interface QuizEvent { year: number; title: string; }
export interface Quiz {
  question: string;
  options: number[];   // 4 distinct years
  correctIndex: number;
  answerYear: number;
  title: string;
}

/** Days since the Unix epoch in UTC — the global "question of the day" seed. */
export function seedFromDateUTC(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
}

// Tiny deterministic LCG so the chosen event, distractors, and order are stable
// for a given seed.
function lcg(seed: number): () => number {
  let s = (((seed % 2_147_483_647) + 2_147_483_647) % 2_147_483_647) || 1;
  return () => (s = (s * 48_271) % 2_147_483_647) / 2_147_483_647;
}

/** Build a puzzle from a day's events. Requires events.length >= 1. */
export function pickQuiz(events: QuizEvent[], seed: number): Quiz {
  if (events.length === 0) throw new Error('pickQuiz needs at least one event');
  const rand = lcg(seed);
  const ev = events[Math.floor(rand() * events.length)];
  const correct = ev.year;

  const offsets = [1, -1, 2, -2, 3, -3, 5, -5, 7, -7, 10, -10, 4, -4, 6, -6];
  const distractors: number[] = [];
  for (const off of offsets) {
    const cand = correct + off;
    if (cand > 0 && cand !== correct && !distractors.includes(cand)) distractors.push(cand);
    if (distractors.length === 3) break;
  }

  const options = [correct, ...distractors];
  for (let i = options.length - 1; i > 0; i--) { // seeded Fisher–Yates
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    question: `In which year did this happen: ${ev.title}?`,
    options,
    correctIndex: options.indexOf(correct),
    answerYear: correct,
    title: ev.title,
  };
}

/**
 * Pick the puzzle for `refDate` (interpreted in UTC) from a pool keyed by
 * "MM-DD". Prefers today's events; otherwise deterministically falls back to an
 * available date so there is always a valid puzzle (spec §8).
 */
export function selectQuizForToday(pool: Record<string, QuizEvent[]>, refDate: Date): Quiz {
  const seed = seedFromDateUTC(refDate);
  const mm = String(refDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(refDate.getUTCDate()).padStart(2, '0');
  let events = pool[`${mm}-${dd}`];
  if (!events || events.length === 0) {
    const keys = Object.keys(pool).filter((k) => pool[k] && pool[k].length > 0).sort();
    if (keys.length === 0) throw new Error('quiz pool has no events');
    events = pool[keys[seed % keys.length]];
  }
  return pickQuiz(events, seed);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run test -- quiz`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quiz.ts src/lib/quiz.test.ts
git commit -m "feat(core): deterministic daily-quiz selection with tests"
```

---

## Task 5: Typed dataset + integrity guard (`src/data/dates.ts`)

**Files:**
- Create: `src/data/dates.ts`
- Test: `src/data/dates.test.ts`
- Reference (read-only source for the editorial content): `<DESIGN>/src/data/dates.js`

> **Note:** the typed dataset drops the *derived* fields (`dayOfYear`, `zodiac`, `birthstone`, `birthFlower`) that the design's `dates.js` stored — those are now computed from the date by `slug.ts` / `reference.ts`. Keep only `lede`, `events`, `births`, `deaths`, `observances`. Copy the editorial text **verbatim** from `<DESIGN>/src/data/dates.js`.

- [ ] **Step 1: Write the failing integrity test**

`src/data/dates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DATES } from './dates';
import { toSlug, fromSlug } from '../lib/slug';

describe('DATES integrity', () => {
  const keys = Object.keys(DATES);

  it('has at least the four sample dates', () => {
    expect(keys).toEqual(expect.arrayContaining(['01-01', '05-31', '07-04', '12-25']));
  });

  it('every key is a real, zero-padded MM-DD date', () => {
    for (const key of keys) {
      expect(key).toMatch(/^\d{2}-\d{2}$/);
      expect(fromSlug(toSlug(key))).toBe(key);
    }
  });

  it('produces unique slugs', () => {
    const slugs = keys.map(toSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every entry has the required shape and at least one event', () => {
    for (const [key, e] of Object.entries(DATES)) {
      expect(e.lede, key).toBeTruthy();
      expect(Array.isArray(e.events) && e.events.length >= 1, key).toBe(true);
      for (const ev of e.events) {
        expect(typeof ev.year).toBe('number');
        expect(ev.title).toBeTruthy();
        expect(ev.desc).toBeTruthy();
        expect(ev.tag).toBeTruthy();
      }
      for (const b of e.births) {
        expect(typeof b.year).toBe('number');
        expect(b.name).toBeTruthy();
        expect(b.monogram).toBeTruthy();
      }
      expect(Array.isArray(e.deaths), key).toBe(true);
      expect(Array.isArray(e.observances), key).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test -- dates`
Expected: FAIL — `Cannot find module './dates'`.

- [ ] **Step 3: Write the typed dataset**

Create `src/data/dates.ts`. Start with the interfaces below, then for each of the four entries copy the `lede`, `events`, `births`, `deaths`, `observances` values **verbatim** from `<DESIGN>/src/data/dates.js` (omit `dayOfYear`, `zodiac`, `birthstone`, `birthFlower`). The full content:

```ts
// Editorial content for the day pages. Derived facts (day-of-year, zodiac,
// birthstone, birth flower) are COMPUTED from the date — see src/lib. These four
// entries are curated samples to be replaced by the Wikimedia (CC BY-SA) pipeline
// in a later plan. HTML in `desc`/`line`/`text` is intentional (rendered via set:html).

export interface DayEvent { year: number; title: string; desc: string; tag: string; }
export interface DayBirth { monogram: string; name: string; year: number; line: string; }
export interface DayDeath { year: number; text: string; }
export interface DayObservance { text: string; }
export interface DayEntry {
  lede: string;
  events: DayEvent[];
  births: DayBirth[];
  deaths: DayDeath[];
  observances: DayObservance[];
}

export const DATES: Record<string, DayEntry> = {
  '05-31': {
    lede:
      "A clock that started ticking, an ocean liner sliding into the water, and a poet who sang of America — all on this date. Here's what the almanac remembers about May 31.",
    events: [
      { year: 1911, title: 'The Titanic is launched', tag: 'Maritime history',
        desc: 'The hull of the RMS Titanic slides into the River Lagan at Harland &amp; Wolff in Belfast, before more than 100,000 spectators — fitting-out would take another ten months.' },
      { year: 1889, title: 'The Johnstown Flood', tag: 'Disaster',
        desc: 'The South Fork Dam fails after days of heavy rain, sending 20 million tons of water into Johnstown, Pennsylvania — one of the deadliest disasters in U.S. history.' },
      { year: 1859, title: 'Big Ben begins keeping time', tag: 'London',
        desc: 'The Great Clock of Westminster starts ticking above the Houses of Parliament in London — its chimes have marked the hour for the city ever since.' },
      { year: 1790, title: 'The U.S. Copyright Act is signed', tag: 'Law',
        desc: 'President George Washington signs the first federal copyright law, protecting "maps, charts, and books" for a term of fourteen years.' },
      { year: 1669, title: 'Samuel Pepys closes his diary', tag: 'Letters',
        desc: 'Fearing for his failing eyesight, the London diarist writes his final entry, ending one of the most vivid first-hand records of 17th-century life.' },
    ],
    births: [
      { monogram: 'C', name: 'Clint Eastwood', year: 1930, line: 'Actor and Oscar-winning director.' },
      { monogram: 'W', name: 'Walt Whitman', year: 1819, line: 'Poet, author of <em>Leaves of Grass</em>.' },
      { monogram: 'B', name: 'Brooke Shields', year: 1965, line: 'Actor and model.' },
      { monogram: 'C', name: 'Colin Farrell', year: 1976, line: 'Irish screen actor.' },
      { monogram: 'R', name: 'Prince Rainier III', year: 1923, line: 'Sovereign Prince of Monaco.' },
      { monogram: 'D', name: 'Denholm Elliott', year: 1922, line: 'British character actor.' },
    ],
    deaths: [
      { year: 1809, text: '<b>Joseph Haydn</b>, composer who shaped the symphony and string quartet.' },
      { year: 1832, text: '<b>Évariste Galois</b>, mathematician, killed in a duel at twenty.' },
      { year: 2011, text: '<b>Jack Kevorkian</b>, pathologist and right-to-die advocate.' },
    ],
    observances: [
      { text: '<b>World No Tobacco Day</b> — observed worldwide by the WHO.' },
      { text: '<b>National Smile Day</b> (United States).' },
      { text: '<b>Día de Castilla-La Mancha</b> (Spain).' },
    ],
  },

  '01-01': {
    lede:
      "New Year's Day — the calendar resets and the almanac turns its first page. A short sampling of what history records for January 1.",
    events: [
      { year: 1801, title: 'The Act of Union takes effect', tag: 'Politics',
        desc: 'Great Britain and Ireland are joined to form the United Kingdom of Great Britain and Ireland.' },
      { year: 1959, title: 'The Cuban Revolution succeeds', tag: 'Revolution',
        desc: "Fulgencio Batista flees Cuba as Fidel Castro's forces take control of the country." },
    ],
    births: [
      { monogram: 'P', name: 'Paul Revere', year: 1735, line: 'American patriot and silversmith.' },
      { monogram: 'J', name: 'J. Edgar Hoover', year: 1895, line: 'First director of the FBI.' },
    ],
    deaths: [
      { year: 1953, text: '<b>Hank Williams</b>, pioneering country music singer-songwriter.' },
    ],
    observances: [
      { text: "<b>New Year's Day</b> — observed worldwide." },
    ],
  },

  '07-04': {
    lede:
      'Independence Day in the United States — fireworks and founding documents. A short sampling of what history records for July 4.',
    events: [
      { year: 1776, title: 'The U.S. Declaration of Independence is adopted', tag: 'Founding',
        desc: "The Second Continental Congress adopts the Declaration of Independence in Philadelphia, announcing the thirteen colonies' separation from Britain." },
      { year: 1826, title: 'Two presidents die on the same day', tag: 'Politics',
        desc: "John Adams and Thomas Jefferson both die on the fiftieth anniversary of the Declaration's adoption." },
    ],
    births: [
      { monogram: 'C', name: 'Calvin Coolidge', year: 1872, line: '30th President of the United States.' },
      { monogram: 'L', name: 'Louis Armstrong', year: 1901, line: 'Jazz trumpeter and vocalist (date he long claimed).' },
    ],
    deaths: [
      { year: 1826, text: '<b>Thomas Jefferson</b>, third U.S. president and Declaration author.' },
      { year: 1934, text: '<b>Marie Curie</b>, physicist and two-time Nobel laureate.' },
    ],
    observances: [
      { text: '<b>Independence Day</b> (United States).' },
    ],
  },

  '12-25': {
    lede:
      "Christmas Day — bells, candles, and a long list of history's December births. A short sampling of what the almanac records for December 25.",
    events: [
      { year: 800, title: 'Charlemagne is crowned emperor', tag: 'Medieval',
        desc: "Pope Leo III crowns Charlemagne as Emperor of the Romans in St. Peter's Basilica in Rome." },
      { year: 1066, title: 'William the Conqueror is crowned', tag: 'England',
        desc: 'William I is crowned King of England at Westminster Abbey, following the Norman Conquest.' },
    ],
    births: [
      { monogram: 'I', name: 'Isaac Newton', year: 1642, line: 'Mathematician and physicist (Old Style calendar).' },
      { monogram: 'H', name: 'Humphrey Bogart', year: 1899, line: 'American film actor.' },
    ],
    deaths: [
      { year: 1977, text: '<b>Charlie Chaplin</b>, comic actor and filmmaker.' },
    ],
    observances: [
      { text: '<b>Christmas Day</b> — observed in much of the world.' },
    ],
  },
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run test -- dates`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm run test`
Expected: PASS — 5 test files (slug, reference, birthday, quiz, dates).

- [ ] **Step 6: Commit**

```bash
git add src/data/dates.ts src/data/dates.test.ts
git commit -m "feat(data): typed sample dataset + integrity guard"
```

---

## Task 6: Client interaction layer (`src/scripts/datelore.ts`)

**Files:**
- Create: `src/scripts/datelore.ts`

This refactors the design's `datelore.js` to import the now-tested core. DOM wiring stays here; math/selection comes from `src/lib`.

- [ ] **Step 1: Write `src/scripts/datelore.ts`**

```ts
// DateLore — client interaction layer. Pure logic lives in ../lib (unit-tested);
// this file only does DOM wiring. Progressive enhancement: every feature is
// opt-in via data-attributes, so a page without the hooks still renders fine.
import { parseBirthdate, computeBirthday, type BirthdayStats } from '../lib/birthday';
import { selectQuizForToday, type QuizEvent } from '../lib/quiz';
import { toSlug, slugFromParts, monthName } from '../lib/slug';

function fmtNum(n: number): string { return n.toLocaleString('en-US'); }

function setOut(scope: ParentNode, key: string, value: string): void {
  const el = scope.querySelector<HTMLElement>(`[data-bday-out="${key}"]`);
  if (el) el.textContent = value;
}

/* ----------------------------------------------------------- birthday calc */
function renderBirthday(scope: ParentNode, stats: BirthdayStats): void {
  setOut(scope, 'years', fmtNum(stats.years));
  setOut(scope, 'days', fmtNum(stats.totalDays));
  setOut(scope, 'hours', fmtNum(stats.totalHours));
  setOut(scope, 'weekday', stats.weekday);
  setOut(scope, 'zodiac', stats.zodiac);
  setOut(scope, 'chinese', stats.chinese);
  setOut(scope, 'generation', stats.generation);
  setOut(scope, 'countdown', stats.daysToNext === 0 ? 'Today!' : fmtNum(stats.daysToNext));
  setOut(scope, 'pretty', stats.pretty);
  const results = scope.querySelector<HTMLElement>('[data-bday-results]');
  if (results) results.hidden = false;
}

function wireBirthday(): void {
  document.querySelectorAll<HTMLFormElement>('[data-bday-form]').forEach((form) => {
    const input = form.querySelector<HTMLInputElement>('[data-bday-input]');
    const scope: ParentNode = form.closest('[data-bday-scope]') ?? document;
    if (!input) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const parsed = parseBirthdate(input.value);
      const stats = parsed ? computeBirthday(parsed, new Date()) : null;
      const err = scope.querySelector<HTMLElement>('[data-bday-error]');
      if (!stats) {
        input.setAttribute('aria-invalid', 'true');
        if (err) err.hidden = false;
        return;
      }
      input.setAttribute('aria-invalid', 'false');
      if (err) err.hidden = true;
      renderBirthday(scope, stats);
    });
  });
}

/* ------------------------------------------------------------------- quiz */
function streakKey(id: string): string { return `datelore:streak:${id}`; }
function getStreak(id: string): number {
  try { return parseInt(localStorage.getItem(streakKey(id)) || '0', 10) || 0; }
  catch { return 0; }
}
function setStreak(id: string, n: number): void {
  try { localStorage.setItem(streakKey(id), String(n)); } catch { /* ignore */ }
}

function readQuizPool(quiz: Element): Record<string, QuizEvent[]> | null {
  const tag = quiz.querySelector<HTMLScriptElement>('[data-quiz-pool]');
  if (!tag || !tag.textContent) return null;
  try { return JSON.parse(tag.textContent) as Record<string, QuizEvent[]>; }
  catch { return null; }
}

function wireQuiz(): void {
  document.querySelectorAll<HTMLElement>('[data-quiz]').forEach((quiz) => {
    const id = quiz.getAttribute('data-quiz') || 'daily';
    const streakEl = quiz.querySelector<HTMLElement>('[data-quiz-streak]');
    if (streakEl) streakEl.textContent = String(getStreak(id));

    // If a pool is embedded, compute today's puzzle and (re)render question +
    // options. Otherwise the server-rendered fallback markup stands.
    const pool = readQuizPool(quiz);
    const opts = Array.from(quiz.querySelectorAll<HTMLButtonElement>('[data-quiz-opt]'));
    if (pool) {
      try {
        const puzzle = selectQuizForToday(pool, new Date());
        const q = quiz.querySelector<HTMLElement>('[data-quiz-q]');
        if (q) q.textContent = puzzle.question;
        opts.forEach((opt, i) => {
          const label = opt.querySelector<HTMLElement>('[data-quiz-opt-label]') ?? opt;
          label.textContent = String(puzzle.options[i]);
          opt.setAttribute('data-correct', String(i === puzzle.correctIndex));
        });
        const ans = quiz.querySelector<HTMLElement>('[data-quiz-answer]');
        if (ans) ans.textContent = `It happened in ${puzzle.answerYear}.`;
      } catch { /* keep fallback markup */ }
    }

    let answered = false;
    const reveal = quiz.querySelector<HTMLElement>('[data-quiz-reveal]');
    opts.forEach((opt) => {
      opt.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const correct = opt.getAttribute('data-correct') === 'true';
        opts.forEach((o) => {
          o.disabled = true;
          if (o.getAttribute('data-correct') === 'true') o.classList.add('is-correct');
        });
        if (!correct) opt.classList.add('is-wrong');
        const s = correct ? getStreak(id) + 1 : 0;
        setStreak(id, s);
        if (streakEl) streakEl.textContent = String(s);
        if (reveal) {
          reveal.hidden = false;
          const verdict = reveal.querySelector<HTMLElement>('[data-quiz-verdict]');
          if (verdict) verdict.textContent = correct ? 'Correct!' : 'Not quite — streak reset.';
        }
      });
    });
  });
}

/* ------------------------------------------------------------------ share */
function flash(btn: HTMLElement, msg: string): void {
  const prev = btn.getAttribute('data-label') || btn.textContent || '';
  btn.setAttribute('data-label', prev);
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = btn.getAttribute('data-label'); }, 1600);
}
function wireShare(): void {
  document.querySelectorAll<HTMLElement>('[data-share]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-share-url') || location.href;
      const title = btn.getAttribute('data-share-title') || document.title;
      if (navigator.share) {
        navigator.share({ title, url }).catch(() => { /* dismissed */ });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url)
          .then(() => flash(btn, 'Link copied ✓'))
          .catch(() => flash(btn, url));
      } else {
        flash(btn, `Copy: ${url}`);
      }
    });
  });
}

/* ------------------------------------------------ header quick-date jump */
function wireQuickDate(): void {
  document.querySelectorAll<HTMLInputElement>('[data-quick-date]').forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.value) return;
      const [, mm, dd] = input.value.split('-');
      window.location.href = `/${toSlug(`${mm}-${dd}`)}`;
    });
  });
}

/* ----------------------------------------- homepage "today" personalization */
function wireToday(): void {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const slug = slugFromParts(month, day);
  const label = `${monthName(month)} ${day}`;
  document.querySelectorAll<HTMLElement>('[data-today-label]').forEach((el) => {
    el.textContent = label;
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-today-link]').forEach((a) => {
    a.href = `/${slug}`;
  });
}

/* ------------------------------------------------------------------- init */
function init(): void {
  wireBirthday();
  wireQuiz();
  wireShare();
  wireQuickDate();
  wireToday();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

- [ ] **Step 2: Type-check that it resolves its imports (build smoke test deferred)**

No standalone check here — it is verified when the site builds in Task 11. Proceed.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/datelore.ts
git commit -m "feat(client): interaction layer wired to the tested core"
```

---

## Task 7: Layout + chrome (`BaseLayout`, `Header`, `Footer`)

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`

- [ ] **Step 1: Create `src/layouts/BaseLayout.astro`**

Ported from `<DESIGN>/src/layouts/BaseLayout.astro`; only change vs the design is the script import (`.ts`).

```astro
---
import '../styles/global.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

const {
  title = 'DateLore — On This Day, Your Birthday & a Daily History Quiz',
  description = "What happened on this day in history, the story of the day you were born, and a daily ‘which year?’ quiz. A warm almanac of every date.",
  ogImage,
  ogType = 'website',
} = Astro.props;

const canonical = new URL(Astro.url.pathname, Astro.site).href;
const ogImageUrl = ogImage ? new URL(ogImage, Astro.site).href : undefined;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />

    <meta property="og:type" content={ogType} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
    <meta name="twitter:card" content={ogImageUrl ? 'summary_large_image' : 'summary'} />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500&display=swap"
    />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <Header />
    <main id="main">
      <slot />
    </main>
    <Footer />
    <script>
      import '../scripts/datelore.ts';
    </script>
  </body>
</html>
```

- [ ] **Step 2: Create `src/components/Header.astro`**

Nav links now point at root slugs; the "Today" link defaults to `/may-31` and is repointed to the visitor's date by `wireToday` via `data-today-link`.

```astro
---
const path = Astro.url.pathname.replace(/\/$/, '') || '/';
const isDay = path !== '/' && !['/birthday', '/quiz', '/share'].includes(path);
---
<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="wordmark" href="/"><span class="wordmark__mark">✦</span> DateLore</a>
    <nav class="nav" aria-label="Primary">
      <ul>
        <li><a href="/may-31" data-today-link aria-current={isDay ? 'page' : undefined}>Today</a></li>
        <li><a href="/birthday" aria-current={path === '/birthday' ? 'page' : undefined}>Your Birthday</a></li>
        <li><a href="/quiz" aria-current={path === '/quiz' ? 'page' : undefined}>Daily Quiz</a></li>
      </ul>
    </nav>
    <form class="quick-date hide-sm" role="search" aria-label="Jump to a date">
      <label for="qd">Go to date</label>
      <input type="date" id="qd" data-quick-date>
    </form>
  </div>
</header>
```

- [ ] **Step 3: Create `src/components/Footer.astro`**

Same as the design, with the day link updated to the root slug.

```astro
<footer class="site-footer">
  <div class="wrap site-footer__grid">
    <div>
      <a class="wordmark" href="/"><span class="wordmark__mark">✦</span> DateLore</a>
      <p class="muted" style="margin-top:var(--s3);max-width:36ch;">The almanac for every day of the year — history, birthdays, and a daily puzzle.</p>
    </div>
    <div>
      <h3>Explore</h3>
      <ul>
        <li><a href="/may-31" data-today-link>On This Day</a></li>
        <li><a href="/birthday">Your Birthday</a></li>
        <li><a href="/quiz">Daily Quiz</a></li>
      </ul>
    </div>
    <div>
      <h3>About</h3>
      <ul>
        <li><a href="#">How it works</a></li>
        <li><a href="#">Privacy</a></li>
        <li><a href="#">Contact</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap">
    <p class="attribution">
      <span class="attribution__mark" aria-hidden="true">W</span>
      <span>Historical data from <a href="https://en.wikipedia.org/" rel="noopener">Wikipedia</a>, available under the <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener">Creative Commons Attribution-ShareAlike (CC BY-SA)</a> license. DateLore is an independent project and is not affiliated with the Wikimedia Foundation.</span>
    </p>
  </div>
</footer>
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/Header.astro src/components/Footer.astro
git commit -m "feat(ui): port layout, header, and footer to root slug routes"
```

---

## Task 8: Day page (`src/pages/[slug].astro`)

**Files:**
- Create: `src/pages/[slug].astro`

Derived facts come from the core; neighbors come from the available dataset so no link 404s during the sample-data phase.

- [ ] **Step 1: Create `src/pages/[slug].astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { DATES } from '../data/dates.js';
import { toSlug, monthName, dayOfYear, ordinal, sortKeysByDate } from '../lib/slug';
import { zodiacForDate, birthstoneForMonth, birthFlowerForMonth } from '../lib/reference';

export function getStaticPaths() {
  return Object.keys(DATES).map((key) => ({
    params: { slug: toSlug(key) },
    props: { key },
  }));
}

const { key } = Astro.props as { key: string };
const entry = DATES[key];
const [mm, dd] = key.split('-').map(Number);
const mName = monthName(mm);
const z = zodiacForDate(mm, dd);
const stone = birthstoneForMonth(mm);
const flower = birthFlowerForMonth(mm);
const doy = dayOfYear(mm, dd);

const sorted = sortKeysByDate(Object.keys(DATES));
const i = sorted.indexOf(key);
const prevKey = sorted[(i - 1 + sorted.length) % sorted.length];
const nextKey = sorted[(i + 1) % sorted.length];
const label = (k: string) => {
  const [m, d] = k.split('-').map(Number);
  return `${monthName(m)} ${d}`;
};

const shareTitle = `On This Day — ${mName} ${dd} · DateLore`;
---
<BaseLayout
  title={`${mName} ${dd} — On This Day · DateLore`}
  description={`What happened on ${mName} ${dd} — historical events, famous birthdays, deaths, and observances. Plus the zodiac, birthstone, and birth flower for the date.`}
>
  <!-- ===== Date header ===== -->
  <section class="band band--tight">
    <div class="wrap">
      <p class="eyebrow">On This Day · The {ordinal(doy)} day of the year</p>
      <div class="date-head" style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:var(--s4);margin-top:var(--s3);">
        <h1 style="font-size:var(--step-6);line-height:.95;">
          {mName} <span style="color:var(--gold-deep);">{dd}</span>
        </h1>
        <button class="btn btn--ghost btn--sm" data-share data-share-title={shareTitle} aria-label="Share this date">
          <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
          Share
        </button>
      </div>
      <p class="lede" style="margin-top:var(--s3);">{entry.lede}</p>
      <div class="badges" style="margin-top:var(--s5);">
        <span class="badge"><span class="badge__glyph">{z.glyph}</span><span class="badge__text"><span class="badge__label">Zodiac</span><span class="badge__value">{z.sign}</span></span></span>
        <span class="badge"><span class="badge__glyph">◈</span><span class="badge__text"><span class="badge__label">Birthstone</span><span class="badge__value">{stone}</span></span></span>
        <span class="badge badge--coral"><span class="badge__glyph">❀</span><span class="badge__text"><span class="badge__label">Birth flower</span><span class="badge__value">{flower}</span></span></span>
      </div>
    </div>
  </section>

  <!-- ===== Top leaderboard ad ===== -->
  <div class="wrap" style="margin-block:var(--s4);">
    <div class="ad-slot ad-slot--leaderboard">
      <span class="ad-slot__label">Advertisement</span>
      <span class="ad-slot__note">728 × 90 leaderboard</span>
    </div>
  </div>

  <!-- ===== Main two-column ===== -->
  <section class="band band--tight">
    <div class="wrap day-layout">
      <div class="stack-lg">
        <!-- Timeline -->
        <div>
          <div class="section-head">
            <h2>Events</h2>
            <span class="eyebrow eyebrow--soft">{entry.events.length} notable moments</span>
          </div>
          <ol class="timeline">
            {entry.events.map((e) => (
              <li class="timeline__item">
                <span class="timeline__year">{e.year}</span>
                <div class="timeline__body">
                  <h3 class="timeline__title">{e.title}</h3>
                  <p class="timeline__desc" set:html={e.desc}></p>
                  <span class="timeline__tag">{e.tag}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div class="ad-slot ad-slot--inline">
          <span class="ad-slot__label">Advertisement</span>
          <span class="ad-slot__note">Responsive in-content unit</span>
        </div>

        <!-- Famous birthday twins -->
        <div>
          <div class="section-head">
            <h2>Famous birthday twins</h2>
            <span class="eyebrow eyebrow--coral">Born on {mName} {dd}</span>
          </div>
          <div class="twins">
            {entry.births.map((b) => (
              <article class="twin">
                <span class="twin__monogram" aria-hidden="true">{b.monogram}</span>
                <div><h3 class="twin__name">{b.name}</h3><p class="twin__year">b. {b.year}</p><p class="twin__line" set:html={b.line}></p></div>
              </article>
            ))}
          </div>
        </div>

        <!-- Deaths + Holidays -->
        <div class="grid" style="grid-template-columns:1fr;gap:var(--s6);">
          <div class="card card--pad">
            <div class="section-head" style="margin-bottom:var(--s4);">
              <h2 style="font-size:var(--step-2);">Deaths</h2>
            </div>
            <ul class="mini-list">
              {entry.deaths.map((d) => (
                <li><span class="mini-list__year">{d.year}</span><span class="mini-list__text" set:html={d.text}></span></li>
              ))}
            </ul>
          </div>
          <div class="card card--pad">
            <div class="section-head" style="margin-bottom:var(--s4);">
              <h2 style="font-size:var(--step-2);">Holidays &amp; observances</h2>
            </div>
            <ul class="mini-list">
              {entry.observances.map((o) => (
                <li><span class="mini-list__year">—</span><span class="mini-list__text" set:html={o.text}></span></li>
              ))}
            </ul>
          </div>
        </div>

        <!-- Born on this day CTA -->
        <div class="bcard" data-bday-scope>
          <p class="bcard__eyebrow">Born on this day?</p>
          <h2 class="bcard__date" style="color:var(--on-dark);">Make your birthday card.</h2>
          <p style="color:color-mix(in oklch, var(--on-dark) 86%, transparent);max-width:46ch;">
            Drop in your birth year and we'll work out your exact age, the day of the week you were born, your Chinese zodiac, your generation, and the countdown to your next candle.
          </p>
          <form class="bday-form" data-bday-form style="margin-top:var(--s5);">
            <div class="field">
              <label for="bd-day">Your date of birth</label>
              <input type="date" id="bd-day" data-bday-input required>
            </div>
            <button class="btn btn--coral" type="submit">Reveal my card →</button>
          </form>
          <p data-bday-error hidden style="margin-top:var(--s3);color:var(--gold);">Please pick a valid date in the past.</p>
          <div data-bday-results hidden style="margin-top:var(--s5);">
            <div class="stats">
              <div class="stat stat--coral"><div class="stat__num" data-bday-out="years">—</div><div class="stat__label">Years old</div></div>
              <div class="stat" style="background:color-mix(in oklch,var(--on-dark) 14%,transparent);border-color:transparent;color:var(--on-dark);"><div class="stat__num" data-bday-out="days" style="color:var(--on-dark);">—</div><div class="stat__label" style="color:color-mix(in oklch,var(--on-dark) 75%,transparent);">Days lived</div></div>
              <div class="stat" style="background:color-mix(in oklch,var(--on-dark) 14%,transparent);border-color:transparent;color:var(--on-dark);"><div class="stat__num" data-bday-out="weekday" style="color:var(--on-dark);font-size:var(--step-2);">—</div><div class="stat__label" style="color:color-mix(in oklch,var(--on-dark) 75%,transparent);">Day you were born</div></div>
            </div>
            <p style="margin-top:var(--s4);"><a href="/birthday" style="color:var(--gold);">See the full birthday card →</a></p>
          </div>
        </div>
      </div>

      <!-- Sticky rail -->
      <aside class="day-rail stack">
        <div class="card card--gold card--pad">
          <p class="eyebrow">Daily quiz</p>
          <h2 style="font-size:var(--step-2);margin-top:var(--s2);">Which year did it happen?</h2>
          <p class="muted" style="margin-top:var(--s2);">One question a day. Keep your streak alive.</p>
          <a class="btn btn--primary" href="/quiz" style="margin-top:var(--s4);width:100%;">Play today's quiz</a>
        </div>

        <div class="ad-slot ad-slot--rail">
          <span class="ad-slot__label">Advertisement</span>
          <span class="ad-slot__note">300 × 600 half-page</span>
        </div>

        <nav class="card card--pad" aria-label="Nearby dates">
          <p class="eyebrow eyebrow--soft">Wander the calendar</p>
          <ul style="list-style:none;padding:0;margin-top:var(--s3);display:grid;gap:var(--s2);">
            <li><a href={`/${toSlug(prevKey)}`} style="text-decoration:none;color:var(--ink-soft);">‹ {label(prevKey)}</a></li>
            <li><a href={`/${toSlug(nextKey)}`} style="text-decoration:none;color:var(--ink-soft);">{label(nextKey)} ›</a></li>
            <li><a href="/birthday" style="text-decoration:none;color:var(--ink-soft);">Your birthday →</a></li>
          </ul>
        </nav>
      </aside>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/[slug].astro
git commit -m "feat(pages): day page on /<month>-<day> with derived facts"
```

---

## Task 9: Homepage (`src/pages/index.astro`)

**Files:**
- Modify (replace): `src/pages/index.astro`

Replaces the placeholder. Server-renders a feature-date spotlight; `wireToday` repoints the date label + `data-today-link` CTAs to the visitor's local date.

- [ ] **Step 1: Replace `src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { DATES } from '../data/dates.js';
import { toSlug, monthName } from '../lib/slug';
import { zodiacForDate, birthstoneForMonth, birthFlowerForMonth } from '../lib/reference';

// Server-rendered spotlight (the richest sample date). The client repoints the
// "today" label + links to the visitor's local date via data-today-* hooks.
const FEATURE = '05-31';
const entry = DATES[FEATURE];
const [mm, dd] = FEATURE.split('-').map(Number);
const mName = monthName(mm);
const z = zodiacForDate(mm, dd);
const featureSlug = `/${toSlug(FEATURE)}`;
---
<BaseLayout
  title="DateLore — What happened on this day in history"
  description="DateLore is the almanac for every day of the year. See today in history, famous birthdays, a daily quiz, and the story your own birthday tells."
>
  <!-- ===== Hero ===== -->
  <section class="band">
    <div class="wrap stack">
      <p class="eyebrow">Today · <span data-today-label>{mName} {dd}</span></p>
      <h1 style="font-size:var(--step-6);line-height:.95;">
        On This Day <span style="color:var(--gold-deep);">— <span data-today-label>{mName} {dd}</span></span>
      </h1>
      <p class="lede">
        A warm almanac of every date — historical events, the famous people who share it,
        and the story your own birthday tells. Start with today.
      </p>
      <div class="flow-cta">
        <a class="btn btn--primary" href={featureSlug} data-today-link>See today in history →</a>
        <a class="btn btn--ghost" href="#birthday">Enter your birthday</a>
      </div>
      <div class="badges" style="margin-top:var(--s4);">
        <span class="badge"><span class="badge__glyph">{z.glyph}</span><span class="badge__text"><span class="badge__label">Zodiac</span><span class="badge__value">{z.sign}</span></span></span>
        <span class="badge"><span class="badge__glyph">◈</span><span class="badge__text"><span class="badge__label">Birthstone</span><span class="badge__value">{birthstoneForMonth(mm)}</span></span></span>
        <span class="badge badge--coral"><span class="badge__glyph">❀</span><span class="badge__text"><span class="badge__label">Birth flower</span><span class="badge__value">{birthFlowerForMonth(mm)}</span></span></span>
      </div>
    </div>
  </section>

  <!-- ===== Birthday module ===== -->
  <section class="band band--alt" id="birthday">
    <div class="wrap" data-bday-scope>
      <div class="section-head">
        <h2>Enter your birthday →</h2>
        <span class="eyebrow eyebrow--coral">Takes one tap</span>
      </div>
      <div class="card card--coral card--pad stack">
        <p class="muted" style="margin-top:0;">
          Pick the day you were born and we'll work out your exact age and the day of the week it landed on — then unlock the full card.
        </p>
        <form class="bday-form" data-bday-form>
          <div class="field">
            <label for="bd-day">Your date of birth</label>
            <input type="date" id="bd-day" data-bday-input required>
          </div>
          <button class="btn btn--coral" type="submit">Find my birthday →</button>
        </form>
        <p data-bday-error hidden style="color:var(--coral-deep);font-weight:600;">Please pick a valid date in the past.</p>
        <div data-bday-results hidden>
          <div class="stats">
            <div class="stat stat--coral"><div class="stat__num" data-bday-out="years">—</div><div class="stat__label">Years old</div></div>
            <div class="stat"><div class="stat__num" data-bday-out="weekday" style="font-size:var(--step-2);">—</div><div class="stat__label">Day you were born</div></div>
          </div>
          <p style="margin-top:var(--s4);"><a href="/birthday">See the full birthday card →</a></p>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== Leaderboard ad ===== -->
  <div class="wrap" style="margin-block:var(--s4);">
    <div class="ad-slot ad-slot--leaderboard">
      <span class="ad-slot__label">Advertisement</span>
      <span class="ad-slot__note">728 × 90 leaderboard</span>
    </div>
  </div>

  <!-- ===== Spotlight: a day in history ===== -->
  <section class="band band--tight">
    <div class="wrap">
      <div class="section-head">
        <h2>A day in history</h2>
        <span class="eyebrow eyebrow--soft">On <span data-today-label>{mName} {dd}</span></span>
      </div>
      <ol class="timeline">
        {entry.events.slice(0, 3).map((e) => (
          <li class="timeline__item">
            <span class="timeline__year">{e.year}</span>
            <div class="timeline__body">
              <h3 class="timeline__title">{e.title}</h3>
              <p class="timeline__desc" set:html={e.desc}></p>
              <span class="timeline__tag">{e.tag}</span>
            </div>
          </li>
        ))}
      </ol>
      <p style="margin-top:var(--s4);"><a href={featureSlug} data-today-link>See the full day →</a></p>
    </div>
  </section>

  <!-- ===== Born that day ===== -->
  <section class="band band--tight band--alt">
    <div class="wrap">
      <div class="section-head">
        <h2>Born that day</h2>
        <span class="eyebrow eyebrow--coral">Born on <span data-today-label>{mName} {dd}</span></span>
      </div>
      <div class="twins">
        {entry.births.slice(0, 3).map((b) => (
          <article class="twin">
            <span class="twin__monogram" aria-hidden="true">{b.monogram}</span>
            <div><h3 class="twin__name">{b.name}</h3><p class="twin__year">b. {b.year}</p><p class="twin__line" set:html={b.line}></p></div>
          </article>
        ))}
      </div>
      <p style="margin-top:var(--s4);"><a href={featureSlug} data-today-link>See everyone →</a></p>
    </div>
  </section>

  <!-- ===== Daily quiz teaser ===== -->
  <section class="band band--tight">
    <div class="wrap wrap--narrow">
      <div class="card card--gold card--pad stack">
        <p class="eyebrow">Daily quiz</p>
        <h2 style="font-size:var(--step-2);">Which year did it happen?</h2>
        <p class="muted" style="margin-top:0;">One question a day, drawn from the date. Answer right and keep your streak alive.</p>
        <a class="btn btn--primary" href="/quiz">Play today's quiz →</a>
      </div>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(pages): homepage with client-side today personalization"
```

---

## Task 10: Birthday, Quiz, and Share pages

**Files:**
- Create: `src/pages/birthday.astro`
- Create: `src/pages/quiz.astro`
- Create: `src/pages/share.astro`

- [ ] **Step 1: Create `src/pages/birthday.astro`**

Ported from `<DESIGN>/src/pages/birthday.astro`; the only change is the cross-link `/day/05-31` → `/may-31`.

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Your Birthday — The day you were born · DateLore" description="Enter your date of birth and reveal a shareable birthday card: your exact age, days and hours lived, the weekday you were born, your zodiac, Chinese zodiac, generation, and the countdown to your next birthday.">
  <style>
    .stat--on-card {
      background: color-mix(in oklch, var(--on-dark) 14%, transparent);
      border-color: color-mix(in oklch, var(--on-dark) 18%, transparent);
      color: var(--on-dark);
    }
    .stat--on-card .stat__num { color: var(--on-dark); }
    .stat--on-card .stat__label { color: color-mix(in oklch, var(--on-dark) 76%, transparent); }
    .stat--on-card .stat__sub { color: color-mix(in oklch, var(--on-dark) 85%, transparent); }
    .stat__num--word { font-size: var(--step-2); }
    .btn--on-card {
      --btn-bg: color-mix(in oklch, var(--on-dark) 92%, transparent);
      --btn-fg: var(--aubergine-2);
      --btn-bd: transparent;
    }
  </style>
  <div data-bday-scope>
    <section class="band">
      <div class="wrap wrap--narrow stack">
        <p class="eyebrow">Your Birthday</p>
        <h1 style="font-size:var(--step-5);line-height:.98;">The day you were born</h1>
        <p class="lede">
          Pick the date you arrived and we'll turn it into a card worth keeping — your exact age,
          the weekday you were born, your zodiac and Chinese zodiac, your generation, and the
          countdown to your next candle.
        </p>
        <form class="bday-form" data-bday-form>
          <div class="field">
            <label for="bd-day">Your date of birth</label>
            <input type="date" id="bd-day" data-bday-input value="1990-05-31" required>
          </div>
          <button class="btn btn--coral" type="submit">Reveal my card →</button>
        </form>
        <p class="muted" data-bday-error hidden style="color:var(--coral-deep);font-weight:600;">
          Please pick a valid date in the past.
        </p>
      </div>
    </section>

    <section class="band band--alt band--tight">
      <div class="wrap wrap--narrow">
        <div data-bday-results hidden class="stack-lg">
          <div class="bcard">
            <p class="bcard__eyebrow">Your birthday card</p>
            <p class="bcard__date" data-bday-out="pretty">—</p>
            <p style="color:color-mix(in oklch, var(--on-dark) 86%, transparent);max-width:44ch;">
              A card that's all yours to share.
            </p>
            <div class="flow-cta" style="margin-top:var(--s5);">
              <button class="btn btn--on-card" data-share data-share-title="The day I was born — DateLore">
                <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
                Share my card
              </button>
            </div>
          </div>

          <div>
            <div class="section-head">
              <h2>Your numbers</h2>
              <span class="eyebrow eyebrow--soft">Recalculated to today</span>
            </div>
            <div class="stats">
              <div class="stat stat--hero"><div class="stat__num" data-bday-out="years">—</div><div class="stat__label">Years young</div></div>
              <div class="stat stat--coral"><div class="stat__num" data-bday-out="days">—</div><div class="stat__label">Days lived</div></div>
              <div class="stat"><div class="stat__num" data-bday-out="hours">—</div><div class="stat__label">Hours of life</div></div>
              <div class="stat"><div class="stat__num stat__num--word" data-bday-out="weekday">—</div><div class="stat__label">Born on a …</div></div>
              <div class="stat"><div class="stat__num stat__num--word" data-bday-out="zodiac">—</div><div class="stat__label">Zodiac</div></div>
              <div class="stat"><div class="stat__num stat__num--word" data-bday-out="chinese">—</div><div class="stat__label">Chinese zodiac</div></div>
              <div class="stat"><div class="stat__num stat__num--word" data-bday-out="generation">—</div><div class="stat__label">Generation</div></div>
              <div class="stat stat--coral"><div class="stat__num" data-bday-out="countdown">—</div><div class="stat__label">Days to next birthday</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div class="wrap" style="margin-block:var(--s6);">
    <div class="ad-slot ad-slot--rectangle">
      <span class="ad-slot__label">Advertisement</span>
      <span class="ad-slot__note">300 × 250 medium rectangle</span>
    </div>
  </div>

  <section class="band band--tight">
    <div class="wrap wrap--narrow">
      <div class="card card--gold card--pad stack-sm">
        <p class="eyebrow">Share your card</p>
        <h2 style="font-size:var(--step-2);">Made you smile? Pass it on.</h2>
        <p class="muted">
          Tap share to send your birthday card to a friend, then go see what else happened on the day you were born.
        </p>
        <div class="flow-cta" style="margin-top:var(--s4);">
          <button class="btn btn--primary" data-share data-share-title="The day I was born — DateLore">
            <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
            Share my card
          </button>
          <a class="btn btn--ghost" href="/may-31">See what else happened →</a>
        </div>
      </div>
    </div>
  </section>
</BaseLayout>
```

> Note: unlike the design prototype (which hard-coded result values), the results block here starts blank (`—`) and is filled in by `wireBirthday` on submit. The `value="1990-05-31"` default means the form is pre-populated; the user taps "Reveal my card" to compute.

- [ ] **Step 2: Create `src/pages/quiz.astro`**

Embeds the events pool; the client computes today's puzzle. Server-rendered text is a neutral fallback shown if JS is off.

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { DATES } from '../data/dates.js';

// Compact {MM-DD: [{year,title}]} pool for the client's deterministic picker.
const pool = Object.fromEntries(
  Object.entries(DATES).map(([k, v]) => [k, v.events.map((e) => ({ year: e.year, title: e.title }))]),
);
---
<BaseLayout title="Daily Quiz · DateLore" description="Today's DateLore puzzle: one question a day. Guess the year a famous moment from history happened, and build your streak.">
  <section class="band band--tight">
    <div class="wrap wrap--narrow stack-lg text-center">
      <div class="stack-sm">
        <p class="eyebrow">Daily Quiz</p>
        <h1 style="font-size:var(--step-4);">Which year did it happen?</h1>
        <p class="lede" style="margin-inline:auto;">One question a day. Build your streak.</p>
      </div>

      <div class="quiz" data-quiz="daily" style="text-align:left;">
        <script type="application/json" data-quiz-pool set:html={JSON.stringify(pool)}></script>
        <div class="quiz__top">
          <span class="eyebrow eyebrow--soft">Question of the day</span>
          <span class="quiz__streak" title="Your current streak">
            <span aria-hidden="true">🔥</span>
            <span data-quiz-streak>0</span>
          </span>
        </div>

        <p class="quiz__q" data-quiz-q>Loading today's question…</p>

        <div class="quiz__options">
          <button class="quiz__opt" type="button" data-quiz-opt data-correct="false">
            <span class="key" aria-hidden="true">A</span><span data-quiz-opt-label>—</span>
          </button>
          <button class="quiz__opt" type="button" data-quiz-opt data-correct="false">
            <span class="key" aria-hidden="true">B</span><span data-quiz-opt-label>—</span>
          </button>
          <button class="quiz__opt" type="button" data-quiz-opt data-correct="false">
            <span class="key" aria-hidden="true">C</span><span data-quiz-opt-label>—</span>
          </button>
          <button class="quiz__opt" type="button" data-quiz-opt data-correct="false">
            <span class="key" aria-hidden="true">D</span><span data-quiz-opt-label>—</span>
          </button>
        </div>

        <div class="quiz__reveal" data-quiz-reveal hidden>
          <h2 data-quiz-verdict style="font-size:var(--step-2);">—</h2>
          <p class="muted" style="margin-top:var(--s2);" data-quiz-answer>—</p>
          <p style="margin-top:var(--s3);"><a href="/" data-today-link>See the day in history →</a></p>
        </div>
      </div>

      <div class="stack" style="text-align:left;">
        <p class="muted">
          <strong style="color:var(--ink);">How streaks work:</strong> answer correctly to add a day to your streak — it lives in your browser, no account needed. One wrong guess resets the count to zero, so come back tomorrow for a fresh question.
        </p>
        <div class="ad-slot ad-slot--rectangle">
          <span class="ad-slot__label">Advertisement</span>
          <span class="ad-slot__note">336 × 280 rectangle</span>
        </div>
      </div>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 3: Create `src/pages/share.astro`**

Ported from `<DESIGN>/src/pages/share.astro`; day cross-links updated to root slugs.

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout
  title="Share Card — Made to be pinned · DateLore"
  description="The tall 2:3 share cards from DateLore — screenshot-ready almanac and birthday cards built for Pinterest and TikTok."
>
  <style>
    .share-gallery { display: grid; gap: var(--s7); grid-template-columns: 1fr; }
    .share-item { display: flex; flex-direction: column; gap: var(--s4); align-items: center; }
    .share-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--s3); width: 100%; max-width: 480px; }
    .share-row .muted { font-size: var(--step--1); }
    @media (min-width: 720px) {
      .share-gallery { grid-template-columns: 1fr 1fr; align-items: start; }
    }
  </style>

  <section class="band band--tight">
    <div class="wrap wrap--narrow stack text-center">
      <p class="eyebrow">Share card</p>
      <h1 style="font-size:var(--step-5);line-height:.98;">Made to be pinned</h1>
      <p class="lede" style="margin-inline:auto;">
        These are the tall 2:3 cards DateLore builds for every date — the ones people screenshot and pin to Pinterest or drop into a TikTok. Dark, framed, and sized to look good the moment they leave the page.
      </p>
    </div>
  </section>

  <section class="band band--tight">
    <div class="wrap">
      <h2 class="visually-hidden">Share card designs</h2>
      <div class="share-gallery">
        <div class="share-item">
          <article class="ogcard" aria-label="Today in History share card for May 31">
            <p class="ogcard__brand"><span class="mark">✦</span> DateLore</p>
            <p class="ogcard__big">Today in History — May 31</p>
            <p class="ogcard__sub">Big Ben started ticking. The Titanic hit the water.</p>
            <p class="ogcard__foot">datelore.com · on this day</p>
          </article>
          <div class="share-row">
            <button class="btn btn--ghost btn--sm" data-share data-share-title="Today in History — May 31 · DateLore">
              <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
              Share
            </button>
            <span class="muted">Tall format 1080 × 1620 — perfect for Pinterest.</span>
          </div>
        </div>

        <div class="share-item">
          <article class="ogcard" aria-label="Birthday share card for May 31">
            <p class="ogcard__brand"><span class="mark">✦</span> DateLore</p>
            <p class="ogcard__big">Born on May 31?</p>
            <p class="ogcard__sub">Find your zodiac, your birthday twins, and your exact age in days.</p>
            <p class="ogcard__foot">datelore.com · your birthday</p>
          </article>
          <div class="share-row">
            <button class="btn btn--ghost btn--sm" data-share data-share-title="Born on May 31? Find your zodiac and birthday twins · DateLore">
              <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
              Share
            </button>
            <span class="muted">Tall format 1080 × 1620 — perfect for Pinterest.</span>
          </div>
        </div>
      </div>

      <div style="margin-top:var(--s8);">
        <div class="ad-slot ad-slot--inline">
          <span class="ad-slot__label">Advertisement</span>
          <span class="ad-slot__note">Responsive in-content unit</span>
        </div>
      </div>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/birthday.astro src/pages/quiz.astro src/pages/share.astro
git commit -m "feat(pages): birthday, daily quiz, and share-card pages"
```

---

## Task 11: Build verification + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: PASS — 5 test files, all green.

- [ ] **Step 2: Build the static site**

Run: `npm run build`
Expected: build succeeds with no type or import errors.

- [ ] **Step 3: Verify the generated pages exist**

PowerShell:
```powershell
'index','may-31','december-25','july-4','january-1','birthday','quiz','share' |
  ForEach-Object {
    $p = if ($_ -eq 'index') { 'dist\index.html' } else { "dist\$_\index.html" }
    "{0,-14} {1}" -f $_, (Test-Path $p)
  }
```
Expected: every line ends in `True` (8 paths present — the 4 day slugs + home + birthday + quiz + share).

- [ ] **Step 4: Spot-check a built day page**

PowerShell:
```powershell
Select-String -Path "dist\may-31\index.html" -Pattern 'Gemini','Emerald','Lily of the Valley','151st' | Select-Object Line
```
Expected: matches found — confirms derived zodiac/birthstone/flower/day-of-year rendered server-side.

- [ ] **Step 5: Manually preview (optional but recommended)**

Run: `npm run preview`
Then open the printed URL and verify:
- Homepage hero date label shows *today's* date (client `wireToday`), and "See today in history →" points at `/<today-slug>/`.
- `/birthday/` → fill date → "Reveal my card" shows correct age/weekday/zodiac/etc.
- `/quiz/` → a real question with 4 year options renders; answering updates the 🔥 streak.
- `/may-31/` → "Share" button copies the link (or opens the share sheet).
Stop the preview server when done (Ctrl+C).

- [ ] **Step 6: Update the README status line**

In `README.md`, replace the closing `> **Status:** ...` blockquote with:

```markdown
> **Status:** Foundation built — the visual design is live in the app with a unit-tested
> TypeScript core (zodiac/generation/birthstone, birthday math, daily-quiz selection) wired to a
> 4-date sample dataset. Day pages render at `/<month>-<day>` (e.g. `/may-31`). Still to come
> (later plans): the Wikimedia 366-date pipeline, JSON-LD, OG/share images, sitemap, and Ezoic ads.
```

- [ ] **Step 7: Final commit**

```bash
git add README.md
git commit -m "docs: update status to reflect built foundation"
```

---

## Self-Review (completed against the spec)

**Spec coverage (Foundation-relevant sections):**
- §5.1 day pages on readable `/<month>-<day>` slugs → Task 8 (`[slug].astro`) + `toSlug`/`fromSlug` (Task 1). ✓
- §5.1 homepage spotlights *today* (client-side) + birthday box → Task 9 (`wireToday`, `data-today-*`). ✓
- §5.3 birthday personal stats (age, day-of-week, zodiac, Chinese zodiac, generation, next-birthday countdown, birthstone/flower) → Tasks 2–3 + birthday page (Task 10). ✓
- §5.4 daily quiz, date-seeded deterministic pick, localStorage streak → Task 4 + quiz page/client (Tasks 6, 10). ✓
- §8 Feb-29 handling, sparse-data graceful render, UTC quiz seed, invalid-birthdate validation, quiz fallback → Tasks 1/3/4 tests + null-guards. ✓
- §9 tested-core discipline (date fns, quiz determinism, data-integrity guard) → Tasks 1–5 test files. ✓
- §6 CC BY-SA Wikipedia attribution in footer → Task 7 Footer. ✓
- **Deferred by design (later plans, called out in the header):** §6 Wikimedia *pipeline*, §10 JSON-LD/OG-images/sitemap, §11 Ezoic loader. Ad *slot markup* is present; the loader is not.

**Placeholder scan:** every code step contains complete, runnable content; the only "copy" steps (`global.css`, dataset editorial text) reference an exact existing source file and are verbatim ports, not vague TODOs.

**Type consistency:** `BirthdayStats`/`BirthdayInput` (Task 3), `QuizEvent`/`Quiz` (Task 4), and `DayEntry`/`DayEvent`/`DayBirth`/`DayDeath`/`DayObservance` (Task 5) are referenced consistently by the client (Task 6) and pages (Tasks 8–10). Function names (`toSlug`, `slugFromParts`, `fromSlug`, `dayOfYear`, `ordinal`, `sortKeysByDate`, `monthName`, `zodiacForDate`, `birthstoneForMonth`, `birthFlowerForMonth`, `parseBirthdate`, `computeBirthday`, `seedFromDateUTC`, `pickQuiz`, `selectQuizForToday`) match across definition and use.
