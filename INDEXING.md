# DateLore — Indexing Checklist

Production site: **https://datelore.com**

How to index: in **Google Search Console** (and Bing Webmaster Tools), submit the
sitemap once, then use **URL Inspection → Request indexing** for the priority pages
below. The sitemap covers all 386 pages; manual requests just speed up the important ones.

## 1. Submit the sitemap (do this first)
- [ ] `https://datelore.com/sitemap-index.xml`  (Search Console → Sitemaps)
- [ ] `https://datelore.com/robots.txt` resolves and points to the sitemap

## 2. Core pages — request indexing individually
- [ ] `https://datelore.com/`            — home
- [ ] `https://datelore.com/birthday/`   — Your Birthday
- [ ] `https://datelore.com/quiz/`       — Daily Quiz
- [ ] `https://datelore.com/about/`      — About (author bio / Person schema)
- [ ] `https://datelore.com/contact/`
- [ ] `https://datelore.com/privacy/`
- [ ] `https://datelore.com/terms/`
- [ ] `https://datelore.com/share/`

## 3. Month hubs (12)
- [ ] `/january/`  - [ ] `/february/` - [ ] `/march/`     - [ ] `/april/`
- [ ] `/may/`      - [ ] `/june/`     - [ ] `/july/`      - [ ] `/august/`
- [ ] `/september/`- [ ] `/october/`  - [ ] `/november/`  - [ ] `/december/`

## 4. Day pages (366 total — all in the sitemap)
Pattern: `https://datelore.com/<month>-<day>/` e.g. `/may-31/`, `/january-1/`, `/february-29/`.
Don't request all 366 by hand. Seed a few high-interest dates, then let the sitemap do the rest:
- [ ] `/january-1/`   (New Year's Day)
- [ ] `/february-14/` (Valentine's Day)
- [ ] `/july-4/`      (Independence Day)
- [ ] `/october-31/`  (Halloween)
- [ ] `/december-25/` (Christmas)
- [ ] today's date page

## Notes
- After this deploy, re-inspect any page whose content changed so Google re-crawls it.
- Check **Search Console → Pages** for "Discovered/Crawled – not indexed" and prioritize those.
- Bing Webmaster Tools accepts the same `sitemap-index.xml`.
