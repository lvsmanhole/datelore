# AdSense Remediation — Plan 3: Demote Copied Prose to a Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the copied Wikipedia *descriptions* from dominating the day pages — render the factual record as bare `year — title/name` rows, drop the copied descriptive sentences/descriptors, and add clear source attribution — so original content (the lede, the "What happened" answer, "The shape of the day", and the reference blurbs) becomes the substance of the page.

**Architecture:** This is Component §5.1 of the design spec (`docs/superpowers/specs/2026-06-22-adsense-thin-content-design.md`). The decision (locked during brainstorming): demote to a data layer with **section-level attribution and NO per-item links** — the baked data has no source URLs, and constructed Wikipedia links would 404 (broken links are themselves an AdSense red flag). Facts (year, event title, person name) are not copyrightable; the copied descriptive sentences are the "replicated content" to remove. One tiny pure helper (`boldName`) extracts a death entry's name from its baked HTML; everything else is template edits.

**Tech Stack:** Astro 5 (static), TypeScript, vitest.

## Global Constraints

- Remove copied *descriptions*, keep bare *facts*: drop `event.desc`, `event.tag`, `birth.line`, and the descriptor portion of `death.text`; keep `year`, event `title`, person `name`, birth `year`.
- **No per-item source links** (the data has no source URLs; broken links hurt AdSense). Attribution is **section-level** only, pointing to Wikipedia (CC BY-SA).
- Do NOT remove the genuinely-original content: the `lede`, the "What happened on X?" answer, "The shape of the day" analysis, and the zodiac/birthstone/flower blurbs stay.
- Pure logic in `src/lib` (unit-tested with `npm test`); `.astro` files do presentation/wiring only. Internal links keep trailing slashes.
- Observances stay as-is (short factual feast-day labels, not prose).

## File Structure

- **Create** `src/lib/demote.ts` — `boldName(html)` extracts a person's name from a baked death entry (`<b>Name</b>, descriptor`).
- **Create** `src/lib/demote.test.ts`.
- **Modify** `src/components/DayContent.astro` — events → `year — title`; births → name + year; deaths → `year — name`; add a section-level Wikipedia attribution line.
- **Modify** `src/pages/index.astro` — the homepage "A day in history" spotlight and "Born that day" blocks: drop the copied `desc`/`tag`/`line`.

---

### Task 1: `boldName` — extract a death entry's name (drop the copied descriptor)

**Files:**
- Create: `src/lib/demote.ts`
- Test: `src/lib/demote.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `boldName(html: string): string`

- [ ] **Step 1: Write the failing test** — `src/lib/demote.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { boldName } from './demote';

describe('boldName', () => {
  it('extracts the bolded name and drops the descriptor', () => {
    expect(boldName('<b>Dieter Laser</b>, German actor')).toBe('Dieter Laser');
  });
  it('decodes &amp; inside a name', () => {
    expect(boldName('<b>Earth, Wind &amp; Fire</b>, American band')).toBe('Earth, Wind & Fire');
  });
  it('falls back to stripped text when there is no bold tag', () => {
    expect(boldName('Some Name, a thing')).toBe('Some Name, a thing');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- demote`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement** — `src/lib/demote.ts`

```ts
// Pull the person's name out of a baked death entry's HTML (`<b>Name</b>, descriptor`),
// so the day page can show the FACT (who died) without the copied Wikipedia descriptor.
// Pure + unit-tested.
export function boldName(html: string): string {
  const m = html.match(/<b>([\s\S]*?)<\/b>/i);
  const raw = m ? m[1] : html;
  return raw
    .replace(/<[^>]*>/g, '') // strip any stray tags
    .replace(/&amp;/g, '&')  // decode the one entity the dataset uses for names
    .trim();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- demote`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/demote.ts src/lib/demote.test.ts
git commit -m "feat(demote): boldName helper to extract death-entry names"
```

---

### Task 2: Demote the day-page record + add attribution

**Files:**
- Modify: `src/components/DayContent.astro`

**Interfaces:**
- Consumes: `boldName` (Task 1).
- Produces: day pages whose events/births/deaths show only facts, plus a Wikipedia attribution line.

- [ ] **Step 1: Import `boldName`**

In `src/components/DayContent.astro`, add after the existing `import { BUILD_ISO } from '../lib/build-meta';` line:

```ts
import { boldName } from '../lib/demote';
```

- [ ] **Step 2: Demote the Events timeline (drop `desc` + `tag`)**

Replace this block:

```astro
              <div class="timeline__body">
                <h3 class="timeline__title">{e.title}</h3>
                <p class="timeline__desc" set:html={e.desc}></p>
                <span class="timeline__tag">{e.tag}</span>
              </div>
```

with:

```astro
              <div class="timeline__body">
                <h3 class="timeline__title">{e.title}</h3>
              </div>
```

- [ ] **Step 3: Demote the birthday twins (drop `line`)**

Replace this block:

```astro
            <article class="twin">
              <span class="twin__monogram" aria-hidden="true">{b.monogram}</span>
              <div><h3 class="twin__name">{b.name}</h3><p class="twin__year">b. {b.year}</p><p class="twin__line" set:html={b.line}></p></div>
            </article>
```

with:

```astro
            <article class="twin">
              <span class="twin__monogram" aria-hidden="true">{b.monogram}</span>
              <div><h3 class="twin__name">{b.name}</h3><p class="twin__year">b. {b.year}</p></div>
            </article>
```

- [ ] **Step 4: Demote the Deaths list (name only, via `boldName`)**

Replace this line:

```astro
              <li><span class="mini-list__year">{d.year}</span><span class="mini-list__text" set:html={d.text}></span></li>
```

with:

```astro
              <li><span class="mini-list__year">{d.year}</span><span class="mini-list__text">{boldName(d.text)}</span></li>
```

- [ ] **Step 5: Add the section-level attribution**

Find the `<!-- Born on this day CTA -->` comment. Immediately BEFORE it, insert:

```astro
      <p class="muted" style="font-size:var(--step--1);">
        The factual record above — events, births, deaths and observances — is compiled from <a href="https://en.wikipedia.org/" rel="noopener">Wikipedia</a> (<a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener">CC BY-SA</a>). The summaries and analysis are DateLore's own.
      </p>
```

- [ ] **Step 6: Build and verify (use january-1, whose data is known)**

Run: `npm test` → all pass (incl. `demote`).
Run: `npm run build`
Structural checks (these confirm the copied prose elements are gone). Note `grep -c` exits 1 when it prints `0` — that 0 is the GOOD result here; report the number, don't treat the exit code as failure:
- `grep -c 'timeline__desc' dist/january-1/index.html` → Expected `0` (event descriptions removed)
- `grep -c 'twin__line' dist/january-1/index.html` → Expected `0` (birth descriptors removed)
Content checks:
- `grep -o 'Ellis Island' dist/january-1/index.html | wc -l` → Expected ≥ 1 (event TITLE retained)
- `grep -c 'begins processing immigrants' dist/january-1/index.html` → Expected `0` (event DESC gone)
- `grep -o 'Grace Hopper' dist/january-1/index.html | wc -l` → Expected ≥ 1 (death NAME retained)
- `grep -c 'co-developed COBOL' dist/january-1/index.html` → Expected `0` (death DESCRIPTOR gone)
- `grep -c 'Irish-English actor' dist/january-1/index.html` → Expected `0` (birth line gone)
- `grep -o 'compiled from' dist/january-1/index.html | wc -l` → Expected `1` (attribution present)

- [ ] **Step 7: Commit**

```bash
git add src/components/DayContent.astro
git commit -m "feat(demote): day-page record as facts only + Wikipedia attribution"
```

---

### Task 3: Demote the homepage spotlight + born-that-day

**Files:**
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: nothing (template-only).
- Produces: a homepage whose "A day in history" and "Born that day" blocks show facts only.

- [ ] **Step 1: Demote the "A day in history" spotlight (drop `desc` + `tag`)**

In `src/pages/index.astro`, replace this block:

```astro
            <div class="timeline__body">
              <h3 class="timeline__title">{e.title}</h3>
              <p class="timeline__desc" set:html={e.desc}></p>
              <span class="timeline__tag">{e.tag}</span>
            </div>
```

with:

```astro
            <div class="timeline__body">
              <h3 class="timeline__title">{e.title}</h3>
            </div>
```

- [ ] **Step 2: Demote the "Born that day" block (drop `line`)**

Replace this line:

```astro
            <div><h3 class="twin__name">{b.name}</h3><p class="twin__year">b. {b.year}</p><p class="twin__line" set:html={b.line}></p></div>
```

with:

```astro
            <div><h3 class="twin__name">{b.name}</h3><p class="twin__year">b. {b.year}</p></div>
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
- `grep -c 'timeline__desc' dist/index.html` → Expected `0`
- `grep -c 'twin__line' dist/index.html` → Expected `0`
- `grep -o 'A day in history' dist/index.html | wc -l` → Expected ≥ 1 (the section + its facts still render)

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(demote): homepage spotlight + born-that-day show facts only"
```

---

## Self-Review

**Spec coverage (§5.1 demotion):**
- Copied event descriptions/tags removed (day page + homepage) → Tasks 2, 3. ✓
- Copied birth descriptors removed → Tasks 2, 3. ✓
- Copied death descriptors removed, name retained via `boldName` → Tasks 1, 2. ✓
- No per-item source links; section-level Wikipedia (CC BY-SA) attribution → Task 2 Step 5. ✓
- Original content (lede, answer, shape-of-the-day, blurbs) untouched → confirmed (no edits to those blocks). ✓
- (Takes/essays pipeline + noindex gating = Plan 4; de-dup reference hubs = Plan 5. Out of scope here.)

**Placeholder scan:** No TBD/TODO; every step shows the exact before/after; every command has an expected result. ✓

**Type consistency:** `boldName(html: string): string` (Task 1) is consumed as `{boldName(d.text)}` where `d.text` is the `DayDeath.text` string (Task 2). ✓

**Accepted out-of-scope:** the CSS rules `.timeline__desc`, `.timeline__tag`, `.twin__line` become unused after this plan. They are harmless (no build/runtime effect) and removing them is deferred to a later cleanup, not part of this content-quality change.
