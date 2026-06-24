# DateLore — Indexation & AdSense Recovery Playbook

**The goal:** get 30+ pages indexed *with impressions* in Google Search Console (GSC), then resubmit AdSense. As of the last export (≈2026‑05‑31): **39 indexed, 2 impressions, 364 "Discovered – currently not indexed."**

**The diagnosis (from your own GSC + audit data):** the content work is largely done; the bottleneck is **authority**. "Discovered – currently not indexed" at this scale on a domain with **~0 referring domains** means Google found the URLs but won't spend crawl budget indexing them. Backlinks are the unlock.

---

## Priority 1 — Backlinks (off-site; only you can do this)

Even **5–10 quality referring domains** materially change crawl behavior. You do not need many — you need *some*, from real sites.

- [ ] **Social/profile links** (fast, do today): create and fully fill profiles that link datelore.com — X/Twitter, a subreddit or two you participate in, Pinterest (you already generate pins — wire the profile link), a Facebook page, LinkedIn. These are mostly nofollow but they drive *discovery crawls* and real referral clicks.
- [ ] **Niche directories / "on this day" lists**: submit to history/almanac/trivia directories and "useful sites" roundups. Search `"on this day" sites list`, `history resources directory`, `add url almanac`.
- [ ] **One or two genuine mentions**: a comment/answer where a date fact is actually useful (a history forum, a Reddit thread answering "what happened on X date"), linking the specific day page. Not spam — real, contextual.
- [ ] **HARO / journalist requests**: answer queries needing a "this day in history" angle; a single news pickup is a strong link.
- [ ] **Track it**: re-run the referring-domains report monthly. Target: 5+ referring domains within 60 days.

## Priority 2 — Re-request indexing for the now-improved pages (you, in GSC)

The 30 marquee essay pages + the new `/zodiac/` hubs now carry original content Google last saw as thin. Nudge a re-crawl:

- [ ] GSC → **URL Inspection** → paste a URL → **Request Indexing**. ~10/day cap, so prioritize:
  1. The 30 marquee day pages (they're listed on the homepage now — "Featured editorials").
  2. `/zodiac/` + the 12 sign pages.
  3. The homepage and month hubs.
- [ ] GSC → **Sitemaps** → confirm `sitemap-index.xml` is submitted and "Success" (it regenerates nightly).
- [ ] GSC → **Pages** report → watch "Discovered – currently not indexed" shrink and "Indexed" grow.

## Priority 3 — On-site (DONE in code, ships with this branch)

- [x] **Homepage "Featured editorials"** section linking all 30 essays — internal link equity + crawl priority to the strongest pages.
- [x] **Thin release-month pages noindexed** (`< 3` releases → `noindex, follow`). 13 of 21 month pages were thin/empty (9 totally empty far-future months). Self-healing: each re-indexes automatically once it has ≥3 releases.
- [x] **"Broken images" are a false positive** — IGDB returns 403 only to `AhrefsBot`'s user-agent; Googlebot and browsers get 200, and an `onerror` fallback hides any genuinely-dead cover. No fix needed; ignore that audit line.

## Priority 4 — Monitor, then resubmit (don't jump the gun)

- [ ] Check GSC weekly. **Do not resubmit AdSense** until: **≥30 pages Indexed AND impressions trending up** (not just 1–2). Resubmitting an under-indexed site risks another "low value content" rejection and a longer cooldown.
- [ ] Realistic timeline: **weeks to a few months**, gated mostly on backlinks landing and Google re-crawling. The content and technical work is no longer the blocker.

---

*Deploy note: Cloudflare auto-builds from `main`. The day-data corpus (`src/data/days/*.json`) is statically committed; the 5 manually-added landmark events would be overwritten by a fresh Wikipedia fetch and would need re-applying.*
