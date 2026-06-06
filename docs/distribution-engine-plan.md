# DateLore — Distribution Engine Plan (Pinterest-first)

> Output of a `/plan-ceo-review` strategy session, 2026-06-06.
> Subject: **traffic & revenue path**. Mode: **HOLD-SCOPE** (product is done) **+ build the distribution engine.**
> Companion docs: [`aeo-geo-strategy.md`](../aeo-geo-strategy.md), [`INDEXING.md`](../INDEXING.md),
> [`docs/superpowers/specs/2026-05-31-datelore-onthisday-design.md`](superpowers/specs/2026-05-31-datelore-onthisday-design.md).

## 1. The honest diagnosis

DateLore is built and live, technically polished (clean schema, semantic HTML, llms.txt,
sitemap). But the crawl data is brutal and clear:

| Signal (Ahrefs, 2026-06-05) | Value |
|---|---|
| Referring domains | **0** |
| Organic traffic | **0** |
| Keywords ranking top-3 / top-10 | **0 / 0** |

It's a brand-new, zero-authority site serving **commodity Wikimedia data** (the same bytes
Wikipedia, onthisday.com, Britannica, history.com already own) against entities that have
locked these queries for 20 years.

**The binding constraint is distribution, not more SEO plumbing.** Perfect markup ranks for
nothing on its own. And in 2026, Google AI Overviews increasingly *answer* "what happened on
May 31" inline with no click — so the 366 informational day-pages (the spec's core traffic bet)
are the **most eroded** path. The defensible, AI-proof surface is the **interactive/personal**
one (birthday tool, quiz, shareable cards) — exactly what Pinterest plays into.

The chosen bet: **Pinterest-first social inflow → referral traffic + backlinks → day-pages
finally index and rank.** It's the one channel where DateLore can beat Wikipedia (Wikipedia
makes no pins), it's image-native (matches the existing Satori pipeline), it's evergreen
(pins have multi-year half-life), and it's the lowest weekly-time fit for a 1–3 hr/week owner.

## 2. Hygiene status — mostly a stale-crawl false alarm

The 2026-06-05 Ahrefs crawl (06:47) flagged scary numbers that **investigation deflated**:

| Reported issue | Reality | Action |
|---|---|---|
| 157 "broken" IGDB game covers (403) | **Ahrefs-crawler false-positive.** The URLs return **200** for generic UA, browsers, **and Googlebot** — IGDB's CDN only blocks Ahrefs' bot. Google sees the images fine. | None for SEO. Self-host covers only when/if we make *release-specific* pins (Pinterest's fetcher may be blocked like Ahrefs). |
| 1,173 "missing alt text" | Stale. The only `<img>` in the codebase (`ReleaseCard.astro`) already has `alt`; rows predate the alt commit. | None — verified. |
| 30 structured-data errors (ItemList) | **Already fixed** in commit `581b722` (07:26, *after* the crawl) — Movie/VideoGame-typed items replaced with a valid generic `ItemList`/`ListItem`. | Re-crawl / re-validate to clear. |

**Net:** the genuinely Google-facing hygiene is **already done**. The remaining action is
**operational, owner-side**: re-submit the sitemap + request indexing (GSC + Bing + IndexNow)
per [`INDEXING.md`](../INDEXING.md), then re-crawl in a few weeks to confirm the stale issues clear.

## 3. The engine (what gets built)

A **build-time social-asset generator** that extends the existing Satori/resvg OG pipeline
(`src/pages/og/[slug].png.ts`) into **vertical Pinterest pins**, plus a **machine-readable
posting manifest** and a **tracking convention** so signal is measurable.

```
[build time]
 baked day dataset (src/data/dates.ts) + reference (zodiac/birthstone)
        │
        ▼
 src/lib/pin-card.ts  (pure content: "Born on …" + "… in history")
        │
        ▼
 src/pages/pin/[slug].png.ts  (Satori → 1000×1500 PNG, brand art, attribution)
        │                                   │
        ▼                                   ▼
 /pin/may-31-born.png                 /pins.json  (manifest: image URL +
 /pin/may-31-history.png              UTM'd destination + title + description + board)
        │
[owner / Pinterest API]  ──▶  schedule pins from the manifest, dripped over weeks
        │
        ▼
 UTM'd links ──▶ GA4 referral ──▶ measure ──▶ scale what drives clicks
```

**Pin kinds (per day, two boards):**
- **"Born on [Month] [Day]?"** — targets birthday/personal searches. Shows zodiac sign,
  a famous birthday twin (name + year), birthstone. Links to `/<month>-<day>/`.
- **"[Month] [Day] in history"** — targets history searches. Shows a notable event teaser +
  year, with **Wikimedia CC BY-SA attribution** baked into the card. Links to `/<month>-<day>/`.

**Why same-origin art matters:** pins use DateLore's *own* branded card art (no third-party
images), so IGDB/TMDB hotlink behavior never breaks a pin. Pinterest fetches the PNG from
datelore.com, which doesn't block bots.

## 4. Failure modes (the silent ones that kill content engines)

```
 FAILURE                          | RESCUE                                  | OTHERWISE
 ---------------------------------|-----------------------------------------|---------------------
 3rd-party image baked into a pin | pins use own art; guard test asserts    | broken pin forever
                                  |   every pin image is same-origin        |
 No tracking on links            | UTM on every destination (src/lib/utm)  | "direct" traffic, blind
 Bulk-post day one               | drip cadence (manifest supports batches)| account ban
 Pin links to a changed slug     | guard test: every destination is a real | wasted pins, 404s
                                  |   day slug                              |
 Missing CC BY-SA attribution    | attribution baked into history pins +    | license violation
                                  |   guard test asserts it present         |
 Pin leads with a tragedy        | sensitivity filter skips heavy events    | tone-deaf pin; Pinterest
                                  |   (shooting/disaster/war) → lighter      |   flag risk; brand damage
                                  |   event or lede; covered by tests       |
 Per-date generation crash       | pure pin-card fns unit-tested; build     | a date silently gets
                                  |   fails loudly if data drifts           |   no pin
```

> Verification caught this live: the May 31 history pin first led with "2019 Virginia
> Beach shooting." The `SENSITIVE` filter in `pin-card.ts` now skips such events — the
> same trap the OG "born" card already dodges by leading with births.

## 5. Owner vs. CC split (the time constraint is real)

- **CC (code, ~done in this build):** UTM helper, pin generator, manifest, guard tests.
- **OWNER (irreducible, ~2–3 hrs/wk):**
  1. Pinterest **business account** + **claim datelore.com** (unlocks analytics + rich pins).
  2. Post/schedule pins from `/pins.json`, **dripped** (20–50 high-interest dates first —
     holidays, today, this week's birthdays — *not* all 366 at once).
  3. Read the monthly KPI (referral sessions, indexed-page count, keywords leaving zero).
- **Later optimization:** Pinterest API for scheduled publishing, to cut owner weekly time.

## 6. Rollout & measurement

1. Build → pins + manifest exist; verify a few PNGs render correctly.
2. Owner seeds 20–50 high-interest dates, dripped over weeks.
3. Measure **4–6 weeks** in GA4 (referral source) + GSC (impressions, indexed count).
4. Scale the pin styles/dates that actually drive clicks.

## 7. Honest expectations & kill criterion

Even executed perfectly, this is a **3–9 month compounding play at entertainment-tier RPM
(~$4–5)**. Pinterest builds slowly, then compounds. **Kill criterion:** if after ~3 months of
consistent posting *with the tracking loop in place* there's near-zero referral growth and
pages still won't index, park DateLore as a cheap evergreen asset rather than keep spending
weekly hours.

## 8. NOT in scope (deferred, with rationale)

- **Short-form video (TikTok/Shorts)** — far higher owner-time/skill cost; revisit if Pinterest
  proves the thesis and the owner wants it.
- **Pinterest API automation** — a time-saver, not a prerequisite; add after manual posting works.
- **Approach C (product differentiation / uniqueness moat)** — the deeper long-game; revisit as
  Phase 4 *after* the engine shows traction.
- **Self-hosting IGDB/TMDB covers** — only needed for *release-specific* pins, which aren't in
  the core engine; deferred until/unless we make them.
- **Release-calendar Plan B/C** — frozen until the core almanac earns traffic.

## 9. Build artifacts (this session)

- `src/lib/utm.ts` (+ `utm.test.ts`) — UTM convention helper.
- `src/lib/pin-card.ts` (+ `pin-card.test.ts`) — pure pin content + guard assertions.
- `src/pages/pin/[slug].png.ts` — Satori vertical-pin generator.
- `src/pages/pins.json.ts` — posting manifest endpoint.
