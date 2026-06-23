# AdSense Plan 4 — Marquee Editorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render original, human-reviewed lede essays (≥400 words) above the data timeline on ~30 high-interest dates, sourced from a gated `src/data/essays/MM-DD.md` store that never auto-publishes un-reviewed prose.

**Architecture:** This is **Component 4** of the AdSense remediation spec (`docs/superpowers/specs/2026-06-22-adsense-thin-content-design.md §5.4`). Essays are markdown files with flat frontmatter, baked at build time by an `import.meta.glob` loader that mirrors `src/data/dates.ts`. A pure library (`src/lib/essays.ts`) owns frontmatter parsing + the publish gate and is unit-tested in plain Node; Astro's native `.md` compilation renders the body. `DayContent.astro` renders the essay only when `isPublishable(frontmatter)` is true (`reviewed: true` + full provenance). The dispatcher (`[slug].astro`) swaps in the essay's `summary` as the meta description for those dates. Content production (the 30 essays) is a separate, human-gated workflow: Claude drafts → editorial council reviews/edits → flips `reviewed: true`.

**Tech Stack:** Astro 5 (SSG, `import.meta.glob` eager), TypeScript, Vitest (node env), native Astro markdown (no new dependencies).

## Global Constraints

Exact values copied from the spec; every task's requirements implicitly include these.

- **No auto-publish of generated prose** (spec §6). An essay renders only when `reviewed: true` AND it carries a reviewer + review date. Un-reviewed essays are inert — never rendered, never linked. Claude/subagents MUST NOT set `reviewed: true`; only the human editorial council flips that flag.
- **No new dependencies.** Use `import.meta.glob` (the established baking pattern, see `src/data/dates.ts`) and Astro's built-in markdown. Do not add content collections, a YAML library, or a markdown library.
- **Trailing slashes always** (`astro.config.mjs`, `trailingSlash: 'always'`): every internal `<a href>` ends in `/`.
- **Essays are original, factually grounded, and ≥400 words** (spec §5.4). Grounded means: every claim traces to that date's real `DATES[key]` entries or well-established public history — no invented events, dates, or quotes. The essay must carry a *genuine angle* (a tension, coincidence, irony, concentration, or absence), not a summary of the timeline.
- **Author/reviewer identity:** the site's named author is **Roman Tailor** (see `DayContent.astro:100`, `/about`). Drafts use `author: "Roman Tailor"`; `reviewedBy` is set by whoever performs the editorial review.
- **TDD, DRY, YAGNI, frequent commits.** Pure logic is tested before it is rendered.

---

## File Structure

**New:**
- `src/lib/essays.ts` — pure: `EssayMeta` type, `parseEssay`, `isPublishable`, `essayWordCount`. No Astro, no I/O.
- `src/lib/essays.test.ts` — unit tests for the pure lib (inline strings, deterministic).
- `src/data/essays.ts` — build-time loader: `import.meta.glob('./essays/*.md', { eager: true })` → `ESSAYS: Record<MM-DD, MarkdownInstance<EssayMeta>>`. Mirrors `dates.ts`.
- `src/data/essays.test.ts` — disk integrity test: reads `src/data/essays/*.md` via `fs`, asserts frontmatter shape + the ≥400-word rule on published essays.
- `src/data/essays/.gitkeep` — keeps the empty directory in git until the first essay lands.
- `src/data/essays/11-09.md` — the first marquee exemplar essay (drafted in Task 4, `reviewed: false` until the council approves).

**Modified:**
- `src/components/DayContent.astro` — import `ESSAYS` + `isPublishable`; render the essay section above the timeline (between the "What happened?" answer and "The shape of the day"); add a scoped `.essay-prose` style.
- `src/pages/[slug].astro` — import `ESSAYS` + `isPublishable`; for day pages with a published essay, override `description` with `essay.frontmatter.summary` before building JSON-LD.

**Why this split:** the publish gate and word-count rule are pure functions the test suite can exercise without Astro's markdown runtime (vitest is plain Node — `vitest.config.ts` uses `environment: 'node'`). Rendering stays in the component, where Astro compiles the markdown. The loader is the only Astro-coupled file and has no logic to test beyond "glob keyed by MM-DD," exactly like `dates.ts` (which is itself untested at the loader level).

---

## Task 1: Pure essay library (frontmatter parse + publish gate)

**Files:**
- Create: `src/lib/essays.ts`
- Test: `src/lib/essays.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface EssayMeta { title: string; summary: string; author: string; reviewedBy: string; reviewedOn: string; reviewed: boolean; }`
  - `interface ParsedEssay { meta: EssayMeta; body: string; }`
  - `parseEssay(raw: string): ParsedEssay` — splits a flat `---`-delimited frontmatter block from the markdown body; throws on a missing/malformed block; coerces `reviewed` to boolean.
  - `isPublishable(meta: EssayMeta | null | undefined): boolean` — true only when `reviewed === true` AND `title`, `author`, `reviewedBy`, `reviewedOn` are all non-empty.
  - `essayWordCount(body: string): number` — whitespace-token count of the body.

- [ ] **Step 1: Write the failing test**

Create `src/lib/essays.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseEssay, isPublishable, essayWordCount } from './essays';

const SAMPLE = `---
title: "Sample title"
summary: "A short summary under 160 characters."
author: "Roman Tailor"
reviewedBy: "Roman Tailor"
reviewedOn: "2026-06-23"
reviewed: true
---
Body paragraph one.

Body paragraph two.`;

describe('parseEssay', () => {
  it('splits frontmatter from body and types reviewed as boolean', () => {
    const { meta, body } = parseEssay(SAMPLE);
    expect(meta.title).toBe('Sample title');
    expect(meta.author).toBe('Roman Tailor');
    expect(meta.reviewedOn).toBe('2026-06-23');
    expect(meta.reviewed).toBe(true);
    expect(body.startsWith('Body paragraph one.')).toBe(true);
  });

  it('throws on a file with no frontmatter block', () => {
    expect(() => parseEssay('just some text, no dashes')).toThrow();
  });
});

describe('isPublishable', () => {
  it('is false when reviewed is false', () => {
    const { meta } = parseEssay(SAMPLE.replace('reviewed: true', 'reviewed: false'));
    expect(isPublishable(meta)).toBe(false);
  });

  it('is false when reviewed but the reviewer is blank', () => {
    const { meta } = parseEssay(SAMPLE.replace('reviewedBy: "Roman Tailor"', 'reviewedBy: ""'));
    expect(isPublishable(meta)).toBe(false);
  });

  it('is true for a fully reviewed essay', () => {
    expect(isPublishable(parseEssay(SAMPLE).meta)).toBe(true);
  });

  it('is false for null/undefined', () => {
    expect(isPublishable(null)).toBe(false);
    expect(isPublishable(undefined)).toBe(false);
  });
});

describe('essayWordCount', () => {
  it('counts whitespace-separated words', () => {
    expect(essayWordCount('one two three')).toBe(3);
  });
  it('is zero for blank bodies', () => {
    expect(essayWordCount('   \n  ')).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/lib/essays.test.ts`
Expected: FAIL — `Failed to resolve import "./essays"` (module does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/essays.ts`:

```ts
// Pure helpers for the marquee editorial layer (AdSense spec §5.4). Frontmatter
// parsing + the publish gate live here so the test suite can exercise them in
// plain Node, without Astro's markdown runtime. Rendering uses Astro's native
// .md compilation (see src/data/essays.ts + DayContent.astro).

export interface EssayMeta {
  title: string;
  summary: string;
  author: string;
  reviewedBy: string;
  reviewedOn: string; // YYYY-MM-DD
  reviewed: boolean;
}

export interface ParsedEssay {
  meta: EssayMeta;
  body: string;
}

// Flat `key: value` frontmatter between two `---` fences, then the markdown body.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseEssay(raw: string): ParsedEssay {
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) throw new Error('essay: missing or malformed frontmatter block');
  const [, fm, body] = m;
  const fields: Record<string, string> = {};
  for (const line of fm.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) throw new Error(`essay: malformed frontmatter line: ${line}`);
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }
  return {
    meta: {
      title: fields.title ?? '',
      summary: fields.summary ?? '',
      author: fields.author ?? '',
      reviewedBy: fields.reviewedBy ?? '',
      reviewedOn: fields.reviewedOn ?? '',
      reviewed: fields.reviewed === 'true',
    },
    body: body.trim(),
  };
}

/**
 * The publish gate (spec §6: no auto-publish of generated prose). An essay is
 * publishable only when a human has reviewed it AND its provenance is complete.
 */
export function isPublishable(meta: EssayMeta | null | undefined): boolean {
  return (
    !!meta &&
    meta.reviewed === true &&
    meta.title.length > 0 &&
    meta.author.length > 0 &&
    meta.reviewedBy.length > 0 &&
    meta.reviewedOn.length > 0
  );
}

export function essayWordCount(body: string): number {
  const text = body.trim();
  return text ? text.split(/\s+/).length : 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/lib/essays.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/essays.ts src/lib/essays.test.ts
git commit -m "feat(essays): pure frontmatter parser + publish gate"
```

---

## Task 2: Essay loader + disk integrity test

**Files:**
- Create: `src/data/essays.ts`
- Create: `src/data/essays/.gitkeep`
- Test: `src/data/essays.test.ts`

**Interfaces:**
- Consumes: `EssayMeta` (Task 1); `parseEssay`, `isPublishable`, `essayWordCount` (Task 1).
- Produces: `ESSAYS: Record<string, MarkdownInstance<EssayMeta>>` keyed by `MM-DD` (e.g. `ESSAYS['11-09']`). Each value exposes `.frontmatter: EssayMeta` and `.Content` (an Astro component), per Astro's `MarkdownInstance`.

- [ ] **Step 1: Create the empty essays directory**

Create `src/data/essays/.gitkeep` (empty file) so the directory is tracked before any essay exists. The glob loader and the integrity test both tolerate an empty directory.

- [ ] **Step 2: Write the failing integrity test**

Create `src/data/essays.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEssay, isPublishable, essayWordCount } from '../lib/essays';

const DIR = join(process.cwd(), 'src/data/essays');
const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.md')) : [];

describe('marquee essays integrity (src/data/essays/*.md)', () => {
  it('every essay filename is a valid MM-DD.md', () => {
    for (const f of files) {
      expect(f).toMatch(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\.md$/);
    }
  });

  for (const f of files) {
    it(`${f}: frontmatter is well-formed; published essays carry depth + provenance`, () => {
      const { meta, body } = parseEssay(readFileSync(join(DIR, f), 'utf8'));
      expect(meta.title).not.toBe('');
      expect(meta.summary).not.toBe('');
      expect(meta.author).not.toBe('');
      if (meta.reviewed) {
        expect(isPublishable(meta)).toBe(true);
        expect(meta.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(essayWordCount(body)).toBeGreaterThanOrEqual(400);
      }
    });
  }
});
```

- [ ] **Step 3: Run the test to verify it passes on the empty directory**

Run: `npm run test -- src/data/essays.test.ts`
Expected: PASS — with no `.md` files, only the filename test runs and vacuously passes. (This proves the harness is wired and will guard every future essay.)

- [ ] **Step 4: Write the loader**

Create `src/data/essays.ts`:

```ts
// Marquee editorial store (AdSense spec §5.4). Mirrors src/data/dates.ts: Vite
// inlines the markdown modules at build time — no runtime I/O. Astro compiles
// each .md, exposing `.frontmatter` (typed as EssayMeta) and `.Content`.
import type { MarkdownInstance } from 'astro';
import type { EssayMeta } from '../lib/essays';

const modules = import.meta.glob<MarkdownInstance<EssayMeta>>('./essays/*.md', {
  eager: true,
});

export const ESSAYS: Record<string, MarkdownInstance<EssayMeta>> = {};
for (const path in modules) {
  // "./essays/11-09.md" -> "11-09"
  const key = path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '');
  ESSAYS[key] = modules[path];
}
```

- [ ] **Step 5: Verify the loader type-checks and the build still passes**

Run: `npm run build`
Expected: exit 0 (an empty glob is valid; `ESSAYS` is `{}` for now).

- [ ] **Step 6: Commit**

```bash
git add src/data/essays.ts src/data/essays.test.ts src/data/essays/.gitkeep
git commit -m "feat(essays): build-time markdown loader + disk integrity test"
```

---

## Task 3: Render the essay in DayContent + meta-description override

**Files:**
- Modify: `src/components/DayContent.astro` (imports near line 5–15; new section after the "What happened?" block that ends at line 111; scoped style at end of file)
- Modify: `src/pages/[slug].astro` (imports near line 10–18; day branch around line 45–61)

**Interfaces:**
- Consumes: `ESSAYS` (Task 2), `isPublishable` (Task 1).
- Produces: nothing consumed by later tasks.

Note: there is no published essay in the repo yet, so this task's automated proof is the **negative invariant** (a date with no published essay renders no essay section, and the build stays green). The positive case is verified at the end of Task 4, once an essay is reviewed.

- [ ] **Step 1: Add the essay lookup to DayContent's frontmatter**

In `src/components/DayContent.astro`, add to the import block (after the last import line, `import { boldName, isYearName } from '../lib/demote';`):

```astro
import { ESSAYS } from '../data/essays';
import { isPublishable } from '../lib/essays';
```

Then, after the `const releaseGroups = ...` line (line 45), add:

```astro
const essayMod = ESSAYS[key];
const essay = essayMod && isPublishable(essayMod.frontmatter) ? essayMod : null;
const EssayBody = essay?.Content;
const essayReviewedLabel = essay
  ? new Date(essay.frontmatter.reviewedOn).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  : '';
```

- [ ] **Step 2: Render the essay section above the timeline**

In `src/components/DayContent.astro`, insert this block immediately AFTER the "Direct answer (AEO …)" section that closes at line 111 (`</section>`), and BEFORE the "The shape of the day" comment at line 113:

```astro
<!-- ===== Marquee editorial (original lede essay, reviewed only) ===== -->
{essay && EssayBody && (
  <section class="band band--tight">
    <div class="wrap">
      <div class="section-head"><h2 style="font-size:var(--step-3);">{essay.frontmatter.title}</h2></div>
      <div class="essay-prose stack" style="margin-top:var(--s4);max-width:68ch;">
        <EssayBody />
      </div>
      <p class="muted" style="margin-top:var(--s4);font-size:var(--step--1);">
        Written &amp; reviewed by <a href="/about/" rel="author" style="color:var(--gold-deep);">{essay.frontmatter.author}</a> · Reviewed {essayReviewedLabel}
      </p>
    </div>
  </section>
)}
```

- [ ] **Step 3: Add a scoped style for the rendered markdown**

At the very end of `src/components/DayContent.astro` (after the final closing `</section>`), append:

```astro
<style>
  /* The essay body is compiled markdown, so target its descendants with :global. */
  .essay-prose :global(p) { margin-top: var(--s3); line-height: 1.7; }
  .essay-prose :global(h3) { margin-top: var(--s5); font-size: var(--step-1); }
  .essay-prose :global(a) { color: var(--gold-deep); }
  .essay-prose :global(blockquote) {
    margin-top: var(--s4);
    padding-left: var(--s4);
    border-left: 3px solid var(--gold-deep);
    color: var(--ink-soft);
  }
</style>
```

- [ ] **Step 4: Override the meta description for essay dates in the dispatcher**

In `src/pages/[slug].astro`, add to the import block (after line 18, `import { BUILD_ISO } ...`):

```astro
import { ESSAYS } from '../data/essays';
import { isPublishable } from '../lib/essays';
```

Inside the `if (props.kind === 'day') {` branch, after `description = ...` (line 51) and before `ogImage = ...` (line 52), add:

```astro
  const essayMod = ESSAYS[key];
  if (essayMod && isPublishable(essayMod.frontmatter) && essayMod.frontmatter.summary) {
    description = essayMod.frontmatter.summary;
  }
```

(Placing it before the `jsonld` array is built means the essay summary flows into both the `<meta name="description">` and `dayArticleSchema`'s description.)

- [ ] **Step 5: Build and verify the negative invariant + green build**

Run: `npm run build`
Expected: exit 0.

Then verify a date with no published essay renders no essay markup. Pick any non-marquee date, e.g. `dist/march-3/index.html`:

Run: `grep -c "essay-prose" dist/march-3/index.html`
Expected: `0`.

- [ ] **Step 6: Commit**

```bash
git add src/components/DayContent.astro src/pages/[slug].astro
git commit -m "feat(essays): render reviewed marquee essay above the day timeline"
```

---

## Task 4: Author the first marquee exemplar essay (drafted → editorial gate)

**This is a content task, not a code task.** Its deliverable is human-gated editorial prose, so — by the spec's anti-scaled-content guardrail (§6) — it deliberately ends at a review checkpoint rather than at a passing test. The executor drafts; only the human council publishes.

**Files:**
- Create: `src/data/essays/11-09.md`

- [ ] **Step 1: Read the real data for the date**

Read the entry that the essay must be grounded in:

```bash
cat src/data/days/11-09.json
```

Confirm which real events/births/deaths the date carries. The hypothesised angle for **November 9** is the date's doubled place in German memory — **Kristallnacht (1938)** and the **fall of the Berlin Wall (1989)** share it: the same date holds a night of destruction and a night of liberation. **Verify both appear in `11-09.json` (or are uncontroversial public history for the date).** If the data does not support that juxtaposition, pick the strongest genuine tension actually present in the entries instead — do not invent facts to fit the angle.

- [ ] **Step 2: Draft the essay (≥400 words, original, grounded)**

Create `src/data/essays/11-09.md` with this exact frontmatter shape (`reviewed: false` — the executor MUST NOT self-certify):

```markdown
---
title: "<a real title, an angle — not 'November 9 in history'>"
summary: "<one sentence, <=160 chars, used as the page meta description>"
author: "Roman Tailor"
reviewedBy: ""
reviewedOn: ""
reviewed: false
---
<≥400 words of original prose in DateLore's existing literary voice. Lead with the
angle (the tension/coincidence/irony), weave in the date's real entries by name and
year, and close on an observation — not a recap. Markdown: paragraphs, optional h3
subheads, optional blockquote. No invented facts, dates, or quotes.>
```

Acceptance criteria for the draft:
- `essayWordCount(body) >= 400` (the integrity test enforces this once `reviewed: true`).
- Every named event/person/year appears in `11-09.json` or is well-established public history for the date.
- There is a clear angle in the first paragraph; the piece is not a chronological summary.
- Voice matches existing originals (read `entry.lede` strings and `src/lib/insight-voice.ts` for register).

- [ ] **Step 3: Verify the draft is inert (gate works) and the build is green**

Run: `npm run test -- src/data/essays.test.ts`
Expected: PASS — with `reviewed: false`, only the title/summary/author non-empty checks apply (the ≥400-word + provenance checks are gated behind `reviewed`).

Run: `npm run build`
Expected: exit 0, and the essay does NOT render yet:

```bash
grep -c "essay-prose" dist/november-9/index.html
```
Expected: `0` (still unreviewed).

- [ ] **Step 4: Commit the draft**

```bash
git add src/data/essays/11-09.md
git commit -m "draft(essays): marquee editorial for November 9 (awaiting review)"
```

- [ ] **Step 5: HUMAN REVIEW GATE — hand off, do not proceed automatically**

Stop here and present the draft to the editorial council (the site owner). The reviewer:
1. Edits the prose for accuracy, voice, and originality.
2. Sets `reviewedBy: "<reviewer name>"`, `reviewedOn: "<YYYY-MM-DD>"`, and `reviewed: true`.
3. Re-runs `npm run test -- src/data/essays.test.ts` (now the ≥400-word + provenance assertions are live and MUST pass) and `npm run build`.
4. Verifies the positive case:
   ```bash
   grep -c "essay-prose" dist/november-9/index.html   # expect 1
   ```
5. Commits: `git commit -am "publish(essays): November 9 marquee editorial (reviewed)"`.

Only after a real review may `reviewed: true` be committed. This step completes the end-to-end proof of the pipeline.

---

## Task 5: Marquee content production (iterative, human-gated)

**This task is the ongoing rollout of the remaining ~29 essays. It is NOT auto-completable** — it closes only as the editorial council reviews and publishes. Run it in tier batches so the index recovers incrementally (spec §9: ship in batches).

**Workflow per essay** (repeat of Task 4's shape):
1. Claude reads `src/data/days/MM-DD.json`, finds the genuine angle, drafts `src/data/essays/MM-DD.md` with `reviewed: false`.
2. Commit the draft (`draft(essays): … (awaiting review)`).
3. Editorial council edits, sets provenance, flips `reviewed: true`, re-runs the integrity test + build, verifies `grep -c "essay-prose" dist/<slug>/index.html` is `1`, commits (`publish(essays): …`).

**Seed list (spec §5.4), as MM-DD — draft in tier order:**

- [ ] **Tier 1** (highest interest): `01-01`, `03-14`, `10-29`, `04-15`, `11-09` ✅(Task 4), `02-14`, `07-04`, `09-11`, `12-25`, `08-06`
- [ ] **Tier 2:** `05-08`, `02-29`, `10-31`, `03-08`, `06-06`, `12-07`, `04-22`, `01-15`, `05-29`, `09-17`
- [ ] **Tier 3:** `03-15`, `06-28`, `10-14`, `02-11`, `07-20`, `05-06`, `11-11`, `01-27`, `03-05`, `12-17`

**Done criteria:** each date above has a `reviewed: true` essay that passes the integrity test and renders on its day page. The integrity test (`src/data/essays.test.ts`) is the standing guard — it fails CI if any published essay drops below 400 words or loses its provenance, and if any essay file is misnamed.

**Batch guardrail:** keep drafts at `reviewed: false` until reviewed; do not bulk-flip. An un-reviewed draft is invisible to readers and crawlers, so the calendar can carry a backlog of drafts safely.

---

## Self-Review

**1. Spec coverage (§5.4 + §6 + §7):**
- ≥400-word original lede essays on ~30 dates → Tasks 4–5 + the ≥400-word integrity assertion (Task 2). ✓
- `src/data/essays/MM-DD.md` with author + reviewed-by + date → `EssayMeta` (Task 1), filename rule (Task 2). ✓
- Rendered above the data timeline → Task 3 Step 2 (inserted before the timeline section). ✓
- Claude drafts → council reviews → publish → Tasks 4–5 review gate; `isPublishable` enforces it in code. ✓
- §6 no auto-publish → publish gate (Task 1) + the explicit "MUST NOT self-certify" constraint. ✓
- §7 testing (pure functions unit-tested; routes render; no broken links) → Tasks 1–2 unit/integrity tests; Task 3 build + grep. ✓
- Files limited to `src/data/essays/*` + `DayContent.astro` (+ the loader/lib/dispatcher this design requires) → matches §5.4's named files. ✓

**2. Placeholder scan:** Task 4/5 essay *bodies* are intentionally authored at execution time (the deliverable is human-reviewed editorial content grounded in real data — pre-writing it here would fabricate unreviewed prose, violating §6). Every *code* step contains complete, runnable code. No "TBD"/"add error handling"/"similar to Task N" in code steps. ✓

**3. Type consistency:** `EssayMeta` defined in Task 1 is consumed unchanged by Task 2 (`MarkdownInstance<EssayMeta>`) and Task 3 (`isPublishable(essayMod.frontmatter)`). `ESSAYS` is keyed by `MM-DD` strings, the same key shape as `DATES` (`key`/`dateKey`), so `ESSAYS[key]` in DayContent and `ESSAYS[key]` in `[slug].astro` both align with the existing `key` variable. `isPublishable`/`parseEssay`/`essayWordCount` names match across the lib, both tests, the loader test, and both components. ✓

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-23-adsense-plan-4-marquee-editorial.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Tasks 1–3 (pure infra) run clean end-to-end; Task 4 stops at the human review gate; Task 5 is an ongoing batch loop you drive.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
