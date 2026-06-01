# DateLore — AEO/GEO Strategy

Making DateLore discoverable, extractable, and citable by AI answer engines
(Google AI Overviews, ChatGPT/Search, Perplexity, Gemini, Claude).

> Status: site freshly launched (June 2026). Strong SEO fundamentals are a
> prerequisite for AEO/GEO — pair this with `seo-technical` / `seo-onpage`.

---

## 1. Current AI visibility audit

**Honest caveat:** the site went live this session, so it has almost certainly
not been crawled, indexed, or cited by AI products yet. There is no visibility to
measure today. The "test current AI visibility" step (querying ChatGPT/Perplexity/
Gemini with the priority queries below and noting who gets cited) should be run by
you in ~4–6 weeks once the site is indexed. Right now this audit is **structural**:
how ready the pages are to be extracted and cited once discovered.

What competitors currently win these answers: onthisday.com, Wikipedia
("[Month] [Day]" pages), Britannica "On This Day", history.com. They win on entity
strength and citations, not structure — which is where DateLore can differentiate.

---

## 2. Five-layer scorecard

| Layer | Score | State |
|---|---|---|
| **1. Extractable content structure** | ★★★½ | Strong semantic HTML (`section`/`article`/`nav`/`aside`/`main`), clean H1→H2→H3 hierarchy, ordered timeline `<ol>`, lists for deaths/observances, lede summary. **Gaps:** headers aren't phrased as questions; no explicit 1–3 sentence direct answer to "what happened on [date]". |
| **2. Citation worthiness** | ★★ | Author bio (Roman Tailor) exists on `/about` with Person schema. **Gaps:** day pages credit the *Organization*, not a named expert; no source citations/links on events; no original data; no date stamps; no methodology note. |
| **3. Structured data depth** | ★★★½ | Good linked graph via `@id`: WebSite + Organization + BreadcrumbList + Article (day) + CollectionPage (month). **Gaps:** Organization has no `sameAs`/contact; Article `author` = Org (not Person); no `datePublished`/`dateModified`; month pages lack an `ItemList` of days; no `ImageObject`. |
| **4. AI-readable accessibility** | ★★★ | `robots.txt` allows all crawlers incl. GPTBot/ClaudeBot/PerplexityBot/Google-Extended; **content is server-pre-rendered static HTML** (ideal — AI crawlers don't have to execute JS). **Gap:** no `/llms.txt`. |
| **5. Real-world entity signals** | ★½ | New brand — expected. Organization has a logo but no `sameAs` social links; no Wikidata; no reviews. Build over time; don't force notability. |

---

## 3. Priority queries (the answers DateLore should be cited for)

Per day/month page (×366 / ×12 — huge programmatic surface):
1. What happened on [Month] [Day]? / [Month] [Day] in history
2. Who was born on [Month] [Day]? / famous people born on [date]
3. Who died on [Month] [Day]?
4. What holidays/observances are on [Month] [Day]?
5. What zodiac sign is [Month] [Day]?
6. What is the birthstone / birth flower for [Month]?

Tools/evergreen:
7. What day of the week was I born? / how old am I if born on [date]?
8. What generation is someone born in [year]? (Boomer/Gen X/Millennial/Gen Z/Alpha)
9. What is the Chinese zodiac for [year]?
10. Which year did [event] happen? (quiz angle)

---

## 4. Layer-by-layer remediation plan

### Quick wins (high ROI, low effort)
- **Add `/llms.txt`** at site root: site description, what topics it covers, key URL
  patterns (`/<month>-<day>/`, `/<month>/`, `/birthday/`, `/quiz/`), and a pointer to
  the sitemap. (Layer 4)
- **Direct-answer + question header on day pages.** Open the page body with a
  question H2 phrased like the query and a 1–3 sentence definitive answer, e.g.
  *"What happened on May 31?"* → *"May 31 is the Nth day of the year. Notable events
  include … ; people born this day include … ."* AI extracts the first answer it sees.
  (Layer 1) — edit `DayContent.astro`.
- **Add `ItemList` schema to month hubs** enumerating the 28–31 day-page URLs, so AI
  can crawl/enumerate the set. (Layer 3) — edit `monthCollectionSchema` + page.

### Medium effort
- **Name the author on day Articles.** Either set `author` to the Roman Tailor
  Person entity (with `@id`, `sameAs` to verifiable profiles) or add a credentialed
  "Edited by" Person. Raises citation trust. (Layers 2 + 3) — `jsonld.ts`.
- **Enrich Organization schema** with `sameAs` (social/profile URLs), `founder`
  (Person), and `contactPoint`. (Layers 3 + 5)
- **Add honest date signals.** A visible "Last reviewed: [date]" plus
  `dateModified` in Article schema — only if pages are genuinely reviewed/updated
  (don't fabricate). AI weights recency for time-sensitive queries. (Layers 2 + 3)
- **Cite sources on events.** Link notable events/births to their authoritative
  source (e.g. Wikipedia), which builds reciprocal citation credibility. (Layer 2)

### Longer term (entity strength)
- Stand up + link social profiles via `sameAs`; keep NAP/brand consistent.
- Earn brand mentions on authoritative sites (the off-page play).
- Revisit Wikidata only once genuinely notable.

---

## 5. Implementation roadmap

1. **Week 1 (code):** `llms.txt`; question-header + direct answer in `DayContent.astro`;
   `ItemList` on month hubs. Ship.
2. **Week 2 (code):** named author Person on Articles + Organization `sameAs`/founder;
   source-citation links on events. Validate in Rich Results Test + Schema validator.
3. **Weeks 3–6 (passive):** let Google + AI crawlers index. Verify in Search Console.
4. **Week 6+ (measure):** run the Step-3 live AI-visibility test against the
   priority queries; log who gets cited and why.

---

## 6. Re-test schedule

- **Quarterly:** re-query the priority list across the major AI products; AI ranking/
  citation logic changes fast.
- **After any template change** to `DayContent.astro` / `jsonld.ts`: re-validate schema.
- **Monthly (early):** check Search Console coverage + which day pages get indexed first.

---

## Notes / honest constraints
- I could not run live AI-product queries from here, and the site is too new to be
  cited yet — Section 1 is structural, not measured. Run the live test at week 6.
- FAQPage schema is **intentionally** omitted (no genuine Q&A) — correct call; don't
  add fake FAQ blocks.
- The biggest near-term lever is **Layer 1 (question-header + direct answer)** because
  it multiplies across all 378 programmatic pages at once.
