# DateLore — AdSense "Low Value Content" Remediation

- **Date:** 2026-06-22
- **Status:** Approved design (pending spec review)
- **Author:** Roman Tailor (with Claude + 3-reviewer council)
- **Scope:** Lift datelore.com above Google AdSense's "Low value content" bar and the algorithmic thin-content threshold that is keeping 364/366 pages out of the index.

---

## 1. Problem

`datelore.com` (a static Astro "On This Day" almanac: 366 day pages, 12 month hubs, homepage, birthday tool, daily quiz, releases) was **rejected by AdSense for "Low value content."**

Confirmed facts:
- **No manual action** in Search Console (verified). The thin-content problem is *algorithmic*, not a human penalty — so no reconsideration request is required, only a quality lift + AdSense re-review.
- **364 of 366 pages = "Discovered – currently not indexed"**, 1 = "Crawled – currently not indexed", 8 = "Alternate page with proper canonical tag". Near-zero referring domains (new site).
- Technical AdSense prerequisites are already satisfied: Auto-ads code in `<head>` (`BaseLayout.astro`), correct `ads.txt`, crawlable `robots.txt` + sitemap, canonical tags, HTTPS, privacy/terms/about/contact pages, working nav.

## 2. Root cause

The blocker is the **content itself**, on three axes:

1. **Copied content dominates each page.** Events, births, deaths, observances in `src/data/days/*.json` are near-verbatim Wikipedia "On This Day" text; releases are TMDB/IGDB data. The visible bulk of every day page is third-party content.
2. **Cross-page duplication.** The zodiac/birthstone/birth-flower blurbs in `src/lib/reference-content.ts` are *per-month*, so identical paragraphs repeat on ~30 day pages each. The `lede` and the "What happened on X?" answer are fill-in-the-blank templates across all 366 pages.
3. **Zero authority + thin originality** → Google declines to spend crawl budget / index, and AdSense applies the same quality bar.

The single genuinely-original element today is one computed sentence from `src/lib/insights.ts`.

## 3. Governing principle

> **Original, DateLore-specific content must be the dominant, "reason-to-visit" substance of every indexed page. Third-party facts are demoted to an attributed, linked data layer. No long text segment repeats across pages. Nothing is mass-generated without a human review gate.**

This threads the needle between the two failure modes: *thin/replicated content* (current) and *scaled content abuse* (the trap of bulk-generating 366 essays).

## 4. Goals / Non-goals

**Goals**
- Each indexed day page leads with original content (a per-page "take" + computed insight + authorship), with copied facts demoted to a linked data layer.
- Eliminate cross-page duplicated prose.
- Restore E-E-A-T signals (visible author, review date, freshness metadata).
- Fix internal-link distribution and crawl-budget waste.
- Stand up an indexation + backlink playbook and a staged resubmission gate.

**Non-goals**
- No consolidation/removal of the 366 day pages (owner wants the full calendar).
- Not rewriting every Wikipedia sentence (decision: demote to data, §5.1).
- Not promising approval on a timeline — indexation realistically takes **4–6 months** with backlink work; AdSense is resubmitted only after the index recovers (§5.7).

**Success criteria**
- A reviewer landing on a *random* day page sees original content as the headline and bulk.
- No two day pages share an identical multi-sentence block (enforced by test).
- 30+ pages indexed with impressions **before** AdSense resubmission.
- AdSense "Low value content" cleared on re-review.

## 5. Design — 7 components

### 5.1 Component 1 — Demote copied prose to a linked data layer *(decided)*
Stop rendering the copied descriptive sentences as page prose. Render the factual record as compact, attributed **data rows**:
- **Events:** `year — {event title}`, the title linking to its source (Wikipedia/Wikidata). Drop the copied `desc` sentence from the default render. (Marquee dates may reintroduce original prose, §5.4.)
- **Births / Deaths:** `year — {name}`, name linking to source; drop/replace the copied descriptor `line`/`text` where it is verbatim Wikipedia. A short *original* descriptor may be authored for marquee dates only.
- **Observances:** present as a linked list; trim uncontextualized noise.
- Facts (year + title/name) are not copyrightable; a bare linked timeline + DateLore's own synthesis on top is clean under the replicated-content policy.
- Keep a clear source-attribution line (already present for releases; extend to the timeline).
- **Files:** `src/components/DayContent.astro`, `src/data/types.ts`, possibly a new `src/lib/sources.ts` for source-URL construction.

### 5.2 Component 2 — Scalable per-page original "take" *(the key unlock)*
A short (1–3 sentence) original **angle** at the top of every day page — not a summary, not a statistic. It points at a tension, coincidence, concentration, irony, or absence in that day's record, in DateLore's existing literary voice.

Production pipeline (human-in-the-loop is mandatory — this is what keeps it out of "scaled content abuse"):
1. `insights` classifies each date into a **pattern type** (`contrast | concentration | irony | absence | milestone`) from its own data.
2. A candidate angle is drafted (Claude-assisted) per date, seeded by the pattern type + concrete facts.
3. **Editorial council review gate:** every take is human-reviewed/edited before publish. Drafts are stored, not auto-published.
- **Storage:** new `src/data/takes/MM-DD.json` (or a `take` field added to day data) holding the approved, human-edited take + a `reviewed` flag + reviewer + date.
- **Files:** `src/lib/insights.ts` (pattern classifier), `src/data/takes/*`, `src/components/DayContent.astro`.

### 5.3 Component 3 — Computed insight engine → voice layer
Expand `insights.ts` but route its output through a **voice layer**, not robotic sentence assembly:
- Lead with **corpus-unique facts** that exist nowhere else: rarity/density rank vs all 366 dates, "Nth anniversary this year" math (computed at build, refreshed nightly), birth-profession/nationality distribution parsed from the data, era concentration framed as observation.
- `buildSentence()` → `buildInsightData()` returning **structured fields**; a separate voice layer applies human-written template strings with computed values inserted. Output must vary in *conclusion*, not just numbers.
- Guardrails (encoded as lint/test where feasible): no "By the numbers" heading (reframe, e.g. "The shape of the day"); no percentage/passive/ranking-as-filler phrasing; section must read as insight, not a report.
- **Files:** `src/lib/insights.ts`, `src/lib/insights.test.ts`, new `src/lib/insight-voice.ts`, `DayContent.astro`.

### 5.4 Component 4 — Marquee editorial (~30 dates)
Original lede essays (≥400 words) on high-interest dates with a genuine angle. **Workflow:** Claude drafts → editorial council reviews/edits → publish.
- Prioritized seed list (from the editorial reviewer): Jan 1, Mar 14, Oct 29, Apr 15, Nov 9, Feb 14, Jul 4, Sep 11, Dec 25, Aug 6 (tier 1); May 8, Feb 29, Oct 31, Mar 8, Jun 6, Dec 7, Apr 22, Jan 15, May 29, Sep 17 (tier 2); Mar 15, Jun 28, Oct 14, Feb 11, Jul 20, May 6, Nov 11, Jan 27, Mar 5, Dec 17 (tier 3).
- **Storage:** `src/data/essays/MM-DD.md` (or `.json`) with author + reviewed-by + date; rendered above the data timeline on those dates.
- **Files:** `src/data/essays/*`, `DayContent.astro`.

### 5.5 Component 5 — De-duplicate reference content into hub pages
Move the per-month zodiac/birthstone/birth-flower blurbs out of the day/month templates into **dedicated reference pages** with real depth (300+ words each): `/zodiac/<sign>/`, `/birthstone/<month>/`, `/birth-flower/<month>/`. Each includes etymology, dates covered, and an internal-link list of the days/people it covers. Day & month pages replace the repeated paragraph with a short label + contextual link.
- **Files:** new `src/pages/zodiac/[sign].astro`, `src/pages/birthstone/[month].astro`, `src/pages/birth-flower/[month].astro`; `reference-content.ts` (expand); `DayContent.astro`, `MonthContent.astro` (remove inline blurbs, add links); sitemap picks up new routes automatically.

### 5.6 Component 6 — Authorship, freshness, internal links, crawl hygiene
- **Authorship/E-E-A-T:** visible byline + "Compiled & reviewed by Roman Tailor · last reviewed {date}" on day pages; align JSON-LD `author` with a real `Person` (currently the org); enrich `/about` into a credible author presence. Files: `src/lib/jsonld.ts` (`dayArticleSchema`), `DayContent.astro`, `about.astro`.
- **Freshness:** add `dateModified` to `dayArticleSchema`, reusing `BUILD_LASTMOD` from `astro.config.mjs`. Files: `astro.config.mjs` (export build timestamp), `src/lib/jsonld.ts`.
- **Internal links:** the hardcoded `/may-31/` "Today" link in `Header.astro`, `Footer.astro`, `index.astro` concentrates PageRank on one page. Add a homepage body **"Browse by month"** section linking all 12 hubs + 2–3 featured days; keep the JS-repointed "Today" link but supplement it. Files: `index.astro`, `Header.astro`.
- **Crawl hygiene:** `noindex` non-content pages — `pins/index.astro`, `video-pins/index.astro`; confirm `share.astro` carries a `noindex` meta (it is sitemap-excluded but reachable via the share button). Verify the quick-date form (`Header.astro` + its script) navigates to **trailing-slash** URLs (likely source of the 8 alternate-canonical reports). Files: those pages, `BaseLayout.astro` `noindex` prop, the date-form script.

### 5.7 Component 7 — Indexation + backlinks + staged resubmission
- **Pre-submission:** ship §5.1–5.6, rebuild (bakes new `lastmod`), resubmit `sitemap-index.xml`, request indexing (URL Inspection) for: the 8 alternate-canonical URLs → 12 month hubs → 30 marquee dates → remaining days in batches.
- **Backlinks (co-equal with content, owner/marketing-driven):** niche history/almanac directories; pitch "on this day" columns to local outlets; share the birthday tool to history/genealogy communities (most link-worthy asset).
- **Gate:** **submit the AdSense site review only after 30+ pages are indexed and showing impressions.** Submitting into an unindexed site repeats the rejection.
- **Measurement:** weekly Search Console Coverage; watch "Discovered → Crawled → Indexed" transitions; 8-week checkpoint — if marquee pages index but the tail doesn't move, authority is the binding constraint → escalate backlinks.

## 6. Anti-scaled-content guardrails (apply to every component)
- Every take, essay, and rewritten descriptor passes a **human review gate** before publish (`reviewed: true` + reviewer + date). No auto-publish of generated prose.
- Computed text leads with corpus-unique facts and varies its conclusion; it is a *supporting* layer, never the page's sole claim to originality.
- A build/test check fails if any two day pages share an identical multi-sentence block.
- Reduce ad/affiliate density on the thinnest pages until their content is lifted.

## 7. Testing
- Pure functions (`insights`, pattern classifier, rarity ranking, anniversary math) unit-tested with vitest (extend `insights.test.ts`).
- Duplication test: assert uniqueness of the take + insight block across all 366 generated pages.
- Schema test: every day page emits `author` (Person) + `dateModified`.
- Build smoke test: new reference routes render; no broken internal links; all internal hrefs carry trailing slashes.

## 8. Rollout sequence
1. **Tech + hygiene (fast):** §5.6 + §5.1 demotion + §5.5 de-dup → removes duplication and copied-prose dominance immediately.
2. **Originality layer:** §5.3 insight/voice engine, then §5.2 per-page takes (pipeline + review gate), then §5.4 marquee essays.
3. **Indexation:** §5.7 — rebuild, resubmit, request indexing, begin backlinks.
4. **Gate:** monitor; resubmit AdSense at 30+ indexed.

## 9. Risks
- **Volume of human review** (366 takes + 30 essays + reference pages) is the real cost; mitigated by the pattern-typed drafting pipeline + council. If review capacity is short, ship takes in batches and `noindex` un-reviewed days until done rather than publishing unreviewed content.
- **Backlinks are owner-driven** and outside code; without them indexation stalls regardless of content.
- **Timeline expectations:** months, not days. Communicated and accepted.

## 10. Resolved decisions
- **Storage shape:** takes and essays live in **separate files** (`src/data/takes/MM-DD.json`, `src/data/essays/MM-DD.md`), keeping human-reviewed original content and its review state isolated from the scraped day data.
- **Rollout gating:** **publish a day's take/essay only when `reviewed: true`; `noindex` un-reviewed days** until their original layer is reviewed. We do not hold the whole launch for all 366, and we never publish unreviewed generated prose to an indexable page.
