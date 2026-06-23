# AdSense Remediation — Plan 2: Originality Insight Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single robotic computed sentence on every day page with genuinely-original, per-page-varied analysis — corpus rarity-rank, round-number anniversaries, and era/theme — rendered through a literary voice layer.

**Architecture:** All analysis is pure functions in `src/lib` (unit-tested) computed from the day's own data + the full 366-day corpus. A voice layer turns the structured signals into varied prose that leads with the strongest signal, so the 366 outputs differ in conclusion, not just in numbers. `DayContent.astro` renders the result under a new heading. This is Component 3 of the design spec (`docs/superpowers/specs/2026-06-22-adsense-thin-content-design.md`); it is the scalable originality backbone — the hand-written marquee essays (Plan 3) are the premium layer on top.

**Tech Stack:** Astro 5 (static), TypeScript, vitest.

## Global Constraints

- Pure logic lives in `src/lib` and is unit-tested (`npm test`); `.astro` files do presentation/wiring only.
- No `Math.random()` and no argument-less `new Date()` inside `src/lib` — outputs must be deterministic across builds. The current year comes from `BUILD_ISO` (`src/lib/build-meta.ts`, already created in Plan 1).
- The computed analysis must read as insight, not stat-padding: **no `%` signs**, no passive "is a recurring thread"-only output as the whole section, and the section heading is **"The shape of the day"** (never "By the numbers").
- **Drop** any profession/nationality parsing of `births[].line` (decided — it parses copied text and reads formulaic). Strong signals only: event rarity-rank vs the corpus, round-number anniversaries, dominant era, theme.
- A round anniversary = a **positive multiple of 25** years before the current year; rank centuries (÷100) above 50s above 25s.
- `dayInsights` is consumed only by `src/lib/insights.test.ts` and `src/components/DayContent.astro` — those are the only two files affected by the API refactor.

## File Structure

- **Create** `src/lib/corpus-stats.ts` — corpus-wide event-count stats + percentile rank (pure core + memoized DATES-backed accessor).
- **Create** `src/lib/corpus-stats.test.ts`.
- **Create** `src/lib/anniversaries.ts` — round-number anniversary detection (pure).
- **Create** `src/lib/anniversaries.test.ts`.
- **Modify** `src/lib/insights.ts` — refactor the public API from `dayInsights(...).sentence` to a structured `buildInsightData(entry, month, day, ctx)`; keep the internal `dominantCentury`/`detectTheme` helpers; remove `buildSentence`/`DayInsights`/`dayInsights`.
- **Rewrite** `src/lib/insights.test.ts` — test `buildInsightData`.
- **Create** `src/lib/insight-voice.ts` — `insightProse(data)` voice layer (pure, varied).
- **Create** `src/lib/insight-voice.test.ts`.
- **Modify** `src/components/DayContent.astro` — compute corpus percentile + current year, call the engine + voice layer, render under "The shape of the day".

---

### Task 1: Corpus stats — event density across all 366 days

**Files:**
- Create: `src/lib/corpus-stats.ts`
- Test: `src/lib/corpus-stats.test.ts`

**Interfaces:**
- Consumes: `DayEntry` from `../data/types`; `DATES` from `../data/dates.js`.
- Produces:
  - `buildCorpusStats(entries: DayEntry[]): CorpusStats` where `CorpusStats = { totalDays: number; eventCountsAsc: number[]; avgEvents: number }`
  - `percentileRank(value: number, sortedAsc: number[]): number` (0–100)
  - `corpusStats(): CorpusStats` (memoized, backed by real `DATES`)

- [ ] **Step 1: Write the failing test** — `src/lib/corpus-stats.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { buildCorpusStats, percentileRank } from './corpus-stats';
import type { DayEntry } from '../data/types';

const mk = (n: number): DayEntry => ({
  lede: '',
  events: Array.from({ length: n }, (_, i) => ({ year: 2000 + i, title: 'x', desc: '', tag: '' })),
  births: [], deaths: [], observances: [],
});

describe('buildCorpusStats', () => {
  it('summarizes event counts across the corpus', () => {
    const s = buildCorpusStats([mk(1), mk(3), mk(5)]);
    expect(s.totalDays).toBe(3);
    expect(s.eventCountsAsc).toEqual([1, 3, 5]);
    expect(s.avgEvents).toBe(3);
  });
});

describe('percentileRank', () => {
  const asc = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it('is 100 at the max, ~50 at the median, low at the bottom', () => {
    expect(percentileRank(10, asc)).toBe(100);
    expect(percentileRank(5, asc)).toBe(50);
    expect(percentileRank(1, asc)).toBe(10);
  });
  it('returns 0 for an empty corpus', () => {
    expect(percentileRank(5, [])).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- corpus-stats`
Expected: FAIL — `corpus-stats` module / exports do not exist.

- [ ] **Step 3: Implement** — `src/lib/corpus-stats.ts`

```ts
// Corpus-wide statistics over the whole 366-day dataset, so a single day can be
// described relative to the calendar as a whole ("one of the busier dates"). This
// is genuinely original analysis — it exists nowhere in the source data. Pure core
// (buildCorpusStats / percentileRank) + a memoized DATES-backed accessor.
import { DATES } from '../data/dates.js';
import type { DayEntry } from '../data/types';

export interface CorpusStats {
  totalDays: number;
  eventCountsAsc: number[]; // every day's event count, ascending
  avgEvents: number;
}

export function buildCorpusStats(entries: DayEntry[]): CorpusStats {
  const counts = entries.map((e) => e.events.length);
  const eventCountsAsc = [...counts].sort((a, b) => a - b);
  const total = counts.reduce((sum, n) => sum + n, 0);
  return {
    totalDays: entries.length,
    eventCountsAsc,
    avgEvents: entries.length ? total / entries.length : 0,
  };
}

/**
 * Percentile rank of `value` within `sortedAsc` (0–100): the share of entries
 * less than or equal to `value`. `sortedAsc` MUST be ascending. Empty → 0.
 */
export function percentileRank(value: number, sortedAsc: number[]): number {
  if (sortedAsc.length === 0) return 0;
  let countLE = 0;
  for (const n of sortedAsc) {
    if (n <= value) countLE++;
    else break;
  }
  return Math.round((countLE / sortedAsc.length) * 100);
}

let _cache: CorpusStats | null = null;
/** Memoized stats over the real baked dataset (computed once per build). */
export function corpusStats(): CorpusStats {
  if (!_cache) _cache = buildCorpusStats(Object.values(DATES) as DayEntry[]);
  return _cache;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- corpus-stats`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/corpus-stats.ts src/lib/corpus-stats.test.ts
git commit -m "feat(insights): corpus event-density stats + percentile rank"
```

---

### Task 2: Round-number anniversaries

**Files:**
- Create: `src/lib/anniversaries.ts`
- Test: `src/lib/anniversaries.test.ts`

**Interfaces:**
- Consumes: `DayEvent` from `../data/types`.
- Produces:
  - `interface Anniversary { year: number; title: string; yearsAgo: number }`
  - `roundAnniversaries(events: DayEvent[], currentYear: number): Anniversary[]` (most-significant first)

- [ ] **Step 1: Write the failing test** — `src/lib/anniversaries.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { roundAnniversaries } from './anniversaries';
import type { DayEvent } from '../data/types';

const ev = (year: number, title: string): DayEvent => ({ year, title, desc: '', tag: '' });

describe('roundAnniversaries', () => {
  it('keeps only positive multiples of 25 and ranks centuries first', () => {
    const events = [ev(1926, 'A'), ev(1976, 'B'), ev(2001, 'C'), ev(2010, 'D'), ev(2030, 'E')];
    const r = roundAnniversaries(events, 2026);
    // 1926→100 (century), 1976→50, 2001→25; 2010→16 dropped; 2030 is future, dropped
    expect(r.map((a) => a.yearsAgo)).toEqual([100, 50, 25]);
    expect(r[0]).toMatchObject({ year: 1926, title: 'A', yearsAgo: 100 });
  });
  it('returns empty when nothing lines up', () => {
    expect(roundAnniversaries([ev(2010, 'X')], 2026)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- anniversaries`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement** — `src/lib/anniversaries.ts`

```ts
import type { DayEvent } from '../data/types';

export interface Anniversary {
  year: number;
  title: string;
  yearsAgo: number;
}

/**
 * Round-number anniversaries of a day's events relative to `currentYear`.
 * "Round" = a positive multiple of 25 (25, 50, 75, 100, 150 …). Returned
 * most-significant first: centuries (÷100) outrank 50s outrank 25s; ties broken
 * by how many years ago. Computed, original framing — the source data has no
 * notion of "this year's anniversaries".
 */
export function roundAnniversaries(events: DayEvent[], currentYear: number): Anniversary[] {
  const out: Anniversary[] = [];
  for (const e of events) {
    const yearsAgo = currentYear - e.year;
    if (yearsAgo > 0 && yearsAgo % 25 === 0) {
      out.push({ year: e.year, title: e.title, yearsAgo });
    }
  }
  const weight = (y: number) => (y % 100 === 0 ? 3 : y % 50 === 0 ? 2 : 1);
  return out.sort((a, b) => weight(b.yearsAgo) - weight(a.yearsAgo) || b.yearsAgo - a.yearsAgo);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- anniversaries`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/anniversaries.ts src/lib/anniversaries.test.ts
git commit -m "feat(insights): round-number anniversary detection"
```

---

### Task 3: Refactor `insights.ts` to structured `buildInsightData`

**Files:**
- Modify: `src/lib/insights.ts`
- Rewrite: `src/lib/insights.test.ts`

**Interfaces:**
- Consumes: `roundAnniversaries` + `Anniversary` (Task 2); `monthName` from `./slug`; `DayEntry` from `../data/types`.
- Produces:
  - `interface InsightData { dateLabel: string; eventCount: number; span: { earliest: number; latest: number; years: number } | null; dominantEra: string | null; theme: string | null; birthCount: number; eventPercentile: number | null; topAnniversary: Anniversary | null }`
  - `interface InsightContext { eventPercentile?: number; currentYear?: number }`
  - `buildInsightData(entry: DayEntry, month: number, day: number, ctx?: InsightContext): InsightData`
- Removes: `DayInsights`, `dayInsights`, `buildSentence` (replaced by the voice layer in Task 4).

- [ ] **Step 1: Rewrite the test (write the failing tests)** — replace the entire contents of `src/lib/insights.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { buildInsightData } from './insights';
import type { DayEntry } from '../data/types';

const entry: DayEntry = {
  lede: '',
  events: [
    { year: 1900, title: 'A war begins', desc: 'A great war and battle', tag: 'war' },
    { year: 1926, title: 'A treaty', desc: 'A treaty is signed', tag: 'treaty' },
    { year: 1965, title: 'A battle', desc: 'A military battle', tag: 'war' },
  ],
  births: [
    { monogram: 'A', name: 'Alice', year: 1850, line: 'British author' },
    { monogram: 'B', name: 'Bob', year: 1900, line: 'American actor' },
  ],
  deaths: [],
  observances: [],
};

describe('buildInsightData', () => {
  const d = buildInsightData(entry, 7, 4, { eventPercentile: 90, currentYear: 2026 });

  it('labels the date and counts events/births', () => {
    expect(d.dateLabel).toBe('July 4');
    expect(d.eventCount).toBe(3);
    expect(d.birthCount).toBe(2);
  });
  it('computes the event-year span', () => {
    expect(d.span).toEqual({ earliest: 1900, latest: 1965, years: 65 });
  });
  it('detects the dominant century and a conflict theme', () => {
    expect(d.dominantEra).toBe('20th century');
    expect(d.theme).toBe('conflict is a recurring thread');
  });
  it('passes through the corpus percentile', () => {
    expect(d.eventPercentile).toBe(90);
  });
  it('surfaces a round-number anniversary relative to currentYear', () => {
    expect(d.topAnniversary).toMatchObject({ year: 1926, yearsAgo: 100, title: 'A treaty' });
  });
  it('omits anniversary + percentile when no context is given', () => {
    const bare = buildInsightData(entry, 7, 4);
    expect(bare.eventPercentile).toBeNull();
    expect(bare.topAnniversary).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- insights`
Expected: FAIL — `buildInsightData` is not exported (only `dayInsights` exists).

- [ ] **Step 3: Implement** — replace the entire contents of `src/lib/insights.ts`

```ts
// DateLore-original analysis of a day, COMPUTED from the day's own dataset (and,
// via the caller, from the whole-corpus percentile) — it is our analysis, not
// republished text. Pure + unit-tested. The prose rendering lives in the voice
// layer (insight-voice.ts); this module only produces the structured signals.
import type { DayEntry } from '../data/types';
import { ordinal, monthName } from './slug';
import { roundAnniversaries, type Anniversary } from './anniversaries';

export interface InsightData {
  dateLabel: string; // e.g. "July 4"
  eventCount: number;
  span: { earliest: number; latest: number; years: number } | null;
  dominantEra: string | null; // e.g. "20th century"
  theme: string | null; // a human phrase, e.g. "conflict is a recurring thread"
  birthCount: number;
  eventPercentile: number | null; // 0–100 rarity vs the whole calendar (null if not supplied)
  topAnniversary: Anniversary | null;
}

export interface InsightContext {
  eventPercentile?: number;
  currentYear?: number;
}

// Soft theme detection: each event counts once toward a theme if any keyword hits
// its title/tag/description. The most-matched theme (>= 2 events) wins.
const THEMES: { phrase: string; words: string[] }[] = [
  { phrase: 'conflict is a recurring thread', words: ['war', 'battle', 'siege', 'invasion', 'revolt', 'rebellion', 'military', 'army', 'troops', 'bombing', 'shooting', 'massacre', 'conflict'] },
  { phrase: 'disaster looms large', words: ['earthquake', 'flood', 'wildfire', 'tornado', 'hurricane', 'cyclone', 'eruption', 'volcano', 'disaster', 'crash', 'sinking', 'sank', 'famine', 'plague', 'epidemic'] },
  { phrase: 'science and discovery feature prominently', words: ['discover', 'invent', 'physic', 'chemist', 'spacecraft', 'satellite', 'orbit', 'telescope', 'experiment', 'vaccine', 'patent', 'astronom'] },
  { phrase: 'politics and nation-building recur', words: ['independence', 'treaty', 'constitution', 'founded', 'election', 'republic', 'declaration', 'crowned', 'parliament', 'president', 'kingdom', 'signed'] },
  { phrase: 'culture and the arts appear', words: ['film', 'movie', 'opera', 'album', 'novel', 'published', 'premiere', 'painting', 'symphony', 'broadcast'] },
];

function dominantCentury(years: number[]): string | null {
  if (years.length < 2) return null;
  const counts = new Map<number, number>();
  for (const y of years) {
    const c = Math.floor((y - 1) / 100) + 1;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = 0;
  for (const [c, n] of counts) {
    if (n > bestCount) {
      bestCount = n;
      best = c;
    }
  }
  return bestCount >= 2 ? `${ordinal(best)} century` : null;
}

function detectTheme(entry: DayEntry): string | null {
  const blobs = entry.events.map((e) => `${e.title} ${e.tag} ${e.desc}`.toLowerCase());
  let winner: { phrase: string; count: number } | null = null;
  for (const t of THEMES) {
    let count = 0;
    for (const blob of blobs) if (t.words.some((w) => blob.includes(w))) count++;
    if (count >= 2 && (!winner || count > winner.count)) winner = { phrase: t.phrase, count };
  }
  return winner ? winner.phrase : null;
}

export function buildInsightData(
  entry: DayEntry,
  month: number,
  day: number,
  ctx: InsightContext = {},
): InsightData {
  const years = entry.events.map((e) => e.year).filter((y) => Number.isFinite(y));
  const span = years.length
    ? { earliest: Math.min(...years), latest: Math.max(...years), years: Math.max(...years) - Math.min(...years) }
    : null;
  const annivs = ctx.currentYear != null ? roundAnniversaries(entry.events, ctx.currentYear) : [];
  return {
    dateLabel: `${monthName(month)} ${day}`,
    eventCount: entry.events.length,
    span,
    dominantEra: dominantCentury(years),
    theme: detectTheme(entry),
    birthCount: entry.births.length,
    eventPercentile: ctx.eventPercentile ?? null,
    topAnniversary: annivs[0] ?? null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- insights`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/insights.ts src/lib/insights.test.ts
git commit -m "refactor(insights): structured buildInsightData (corpus + anniversary aware)"
```

---

### Task 4: Voice layer — varied literary prose from the signals

**Files:**
- Create: `src/lib/insight-voice.ts`
- Test: `src/lib/insight-voice.test.ts`

**Interfaces:**
- Consumes: `InsightData` from `./insights` (Task 3).
- Produces: `insightProse(d: InsightData): string`

- [ ] **Step 1: Write the failing test** — `src/lib/insight-voice.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { insightProse } from './insight-voice';
import type { InsightData } from './insights';

const base: InsightData = {
  dateLabel: 'May 31',
  eventCount: 10,
  span: { earliest: 1700, latest: 2011, years: 311 },
  dominantEra: '20th century',
  theme: 'conflict is a recurring thread',
  birthCount: 8,
  eventPercentile: 50,
  topAnniversary: null,
};

describe('insightProse', () => {
  it('leads with a round anniversary when present', () => {
    const s = insightProse({ ...base, topAnniversary: { year: 1926, title: 'the General Strike', yearsAgo: 100 } });
    expect(s).toMatch(/100th anniversary|100 years on/);
    expect(s).toContain('the General Strike');
  });
  it('flags unusually busy dates by percentile', () => {
    const s = insightProse({ ...base, eventPercentile: 95, topAnniversary: null });
    expect(s.toLowerCase()).toMatch(/busiest|busy|crowded|heavier/);
  });
  it('flags unusually quiet dates by percentile', () => {
    const s = insightProse({ ...base, eventPercentile: 10, topAnniversary: null });
    expect(s.toLowerCase()).toMatch(/quiet|light record|passed it by/);
  });
  it('adds an era/theme observation as a second beat', () => {
    expect(insightProse(base)).toContain('20th century');
  });
  it('never emits percent signs or the old "By the numbers" framing', () => {
    const s = insightProse(base);
    expect(s).not.toContain('%');
    expect(s).not.toContain('By the numbers');
    expect(s.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- insight-voice`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement** — `src/lib/insight-voice.ts`

```ts
import type { InsightData } from './insights';

// Deterministic index from a label, so different dates pick different phrasings
// (variety without Math.random, which must not be used in src/lib).
function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

/**
 * Original, literary analysis of a day, assembled from computed signals. Leads
 * with the single strongest signal — a round anniversary, unusual density, or
 * unusual quiet — then adds an era/theme observation, so the prose VARIES in
 * what it concludes across the 366 days rather than reading as one template.
 * This is the scalable baseline; marquee dates get hand-written essays on top.
 */
export function insightProse(d: InsightData): string {
  const parts: string[] = [];
  const seed = d.dateLabel;

  if (d.topAnniversary) {
    const a = d.topAnniversary;
    parts.push(
      pick(
        [
          `This year marks the ${a.yearsAgo}th anniversary of ${a.title} — ${d.dateLabel} carries the weight of round numbers.`,
          `${a.yearsAgo} years on from ${a.title}, ${d.dateLabel} is a date with an anniversary worth pausing on.`,
        ],
        seed,
      ),
    );
  } else if (d.eventPercentile != null && d.eventPercentile >= 80) {
    parts.push(
      pick(
        [
          `Few squares on the calendar are as crowded as ${d.dateLabel}: it sits among the busiest dates of the year for recorded history.`,
          `${d.dateLabel} is one of the year's heavier dates — history kept unusually busy here.`,
        ],
        seed,
      ),
    );
  } else if (d.eventPercentile != null && d.eventPercentile <= 20) {
    parts.push(
      pick(
        [
          `${d.dateLabel} is one of the calendar's quieter dates — history seems to have largely passed it by.`,
          `As calendar dates go, ${d.dateLabel} keeps a light record; not every day is a crossroads.`,
        ],
        seed,
      ),
    );
  } else if (d.span && d.span.years > 0) {
    parts.push(
      pick(
        [
          `${d.dateLabel}'s record stretches ${d.span.years.toLocaleString('en-US')} years, from ${d.span.earliest} to ${d.span.latest}.`,
          `From ${d.span.earliest} to ${d.span.latest}, ${d.dateLabel} gathers ${d.span.years.toLocaleString('en-US')} years of history.`,
        ],
        seed,
      ),
    );
  }

  if (d.dominantEra && d.theme) {
    parts.push(
      pick(
        [
          `Its center of gravity is the ${d.dominantEra}, and ${d.theme}.`,
          `Most of the weight falls in the ${d.dominantEra}, where ${d.theme}.`,
        ],
        seed + 'x',
      ),
    );
  } else if (d.dominantEra) {
    parts.push(`Its center of gravity is the ${d.dominantEra}.`);
  } else if (d.theme) {
    parts.push(`Across its entries, ${d.theme}.`);
  }

  return parts.join(' ');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- insight-voice`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/insight-voice.ts src/lib/insight-voice.test.ts
git commit -m "feat(insights): literary voice layer for computed analysis"
```

---

### Task 5: Render the new analysis on day pages

**Files:**
- Modify: `src/components/DayContent.astro`

**Interfaces:**
- Consumes: `buildInsightData` (Task 3), `insightProse` (Task 4), `corpusStats` + `percentileRank` (Task 1), `BUILD_ISO` (already imported in this file from Plan 1).
- Produces: the rendered "The shape of the day" section (replaces the old "By the numbers" computed sentence).

- [ ] **Step 1: Swap the import**

In `src/components/DayContent.astro`, replace this import line:

```ts
import { dayInsights } from '../lib/insights';
```

with:

```ts
import { buildInsightData } from '../lib/insights';
import { insightProse } from '../lib/insight-voice';
import { corpusStats, percentileRank } from '../lib/corpus-stats';
```

- [ ] **Step 2: Replace the computation**

Replace this line:

```ts
const insights = dayInsights(entry, mm, dd);
```

with:

```ts
const _corpus = corpusStats();
const eventPercentile = percentileRank(entry.events.length, _corpus.eventCountsAsc);
const currentYear = new Date(BUILD_ISO).getUTCFullYear();
const insightProseText = insightProse(buildInsightData(entry, mm, dd, { eventPercentile, currentYear }));
```

- [ ] **Step 3: Rename the heading and render the prose**

Find the heading text `By the numbers` (in the `<h2>` inside the `band--alt` section) and change it to `The shape of the day`.

Then replace this line:

```astro
    <p class="lede" style="margin-top:0;">{insights.sentence}</p>
```

with:

```astro
    <p class="lede" style="margin-top:0;">{insightProseText}</p>
```

(Leave the three reference cards in that section unchanged — they move to dedicated hub pages in the de-duplication plan.)

- [ ] **Step 4: Build and verify**

Run: `npm test` → Expected: all unit tests pass (corpus-stats, anniversaries, insights, insight-voice green).
Run: `npm run build`
Run: `grep -c 'The shape of the day' dist/may-31/index.html` → Expected: `1`.
Run: `grep -c 'By the numbers' dist/may-31/index.html` → Expected: `0`.
Run: `grep -o 'shape of the day' dist/january-1/index.html | wc -l` → Expected: `1` (a second date also renders the section, confirming it is not crashing on varied data).

- [ ] **Step 5: Commit**

```bash
git add src/components/DayContent.astro
git commit -m "feat(insights): render varied computed analysis as 'The shape of the day'"
```

---

## Self-Review

**Spec coverage (Component 3 slice):**
- Corpus rarity-rank vs all 366 → Task 1 + wired in Task 5. ✓
- Round-number anniversaries → Task 2, surfaced in Task 3, voiced in Task 4. ✓
- Structured `buildInsightData` feeding a voice layer (not robotic sentence assembly) → Tasks 3 + 4. ✓
- Heading is "The shape of the day", no `%`, varies by signal → Task 4 tests + Task 5 verify. ✓
- Profession/nationality parse dropped → not implemented anywhere (per decision). ✓
- Deterministic (no Math.random / argless Date in lib; current year from BUILD_ISO) → Task 4 `pick`, Task 5 uses BUILD_ISO. ✓
- (Demotion of copied prose, takes, essays = Plan 3; de-dup hubs = Plan 4. Out of scope here.)

**Placeholder scan:** No TBD/TODO; every code step shows full code; every command has expected output. ✓

**Type consistency:** `CorpusStats.eventCountsAsc` (Task 1) is consumed as `percentileRank(entry.events.length, _corpus.eventCountsAsc)` (Task 5). `Anniversary` (Task 2) flows into `InsightData.topAnniversary` (Task 3) and is read as `a.yearsAgo`/`a.title` (Task 4). `InsightData`/`InsightContext` (Task 3) are consumed by `insightProse` (Task 4) and `buildInsightData(entry, mm, dd, { eventPercentile, currentYear })` (Task 5). `BUILD_ISO` exists from Plan 1. ✓
