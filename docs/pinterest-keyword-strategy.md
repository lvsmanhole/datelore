# Pinterest Keyword Strategy (Phase 0)

Single source for board names, pin-title wording, description formula, hashtags, and the
priority-date posting order. Task 5 (`releasePin`) and Task 7 (manifest) ship with the
**defaults** confirmed below; this doc records what live Pinterest research changed.

> **Data note (read this).** Pinterest gates search results and autocomplete behind a login
> wall for unauthenticated browsers. The live findings below come from the **thin pre-gate
> slice** Pinterest renders before the modal takes over (related-search "guide" pills + the
> first pin title). Full autocomplete + competitor-pin teardown needs *your* logged-in
> session — see "How to refine with your account" at the bottom. The defaults are
> conventional Pinterest SEO best practice and are already live in code; treat the live
> findings as directional, not exhaustive.

---

## 1. Board names (final)

These are locked in code (`ALLOWED_BOARDS` in `src/lib/pin-spec.ts`); keep them verbatim so
pins map to the right board:

- **Born On This Day** — born pins (birthday / zodiac demand)
- **On This Day in History** — history pins
- **Released On This Day** — evergreen release-anniversary pins (create this board by hand first)

No change from defaults. (Pinterest board names are themselves indexed, so keyword-rich
literal names beat clever ones here.)

## 2. Title templates per pin kind (confirmed)

| Kind | Template | Example | Status |
|------|----------|---------|--------|
| born | `Born on [Month] [Day]?` | "Born on June 13?" | keep |
| history | `[Month] [Day] in History` | "June 13 in History" | keep |
| release | `Released on [Month] [Day]` | "Released on June 13" | keep |

These mirror the highest-volume seed phrasings ("born on this day", "on this day in
history"). No change.

## 3. Description formula (confirmed)

Default (in `pinSpecToManifest`):

```
<lines joined by " · "> — <Month> <Day> on DateLore. <hashtags>
```

Keep it. Front-loading the concrete facts (titles/years/signs) before the brand tag matches
how Pinterest surfaces the first ~50 chars in feed. A per-pin `description` override is
available when a pin needs custom copy.

## 4. Hashtag sets per kind

- **release** (code default): `#OnThisDay #OnThisDayInHistory #PopCulture`
- **born** (suggested): `#Birthday #OnThisDay #Zodiac #[Sign]Season` (e.g. `#LeoSeason`)
- **history** (suggested): `#OnThisDay #History #OnThisDayInHistory`

Keep hashtag count low (3–4). Pinterest treats hashtags as weak, recency-biased signals;
the title + description carry the ranking weight.

## 5. Live Pinterest findings (pre-gate pills, unauthenticated)

Harvested via the `/browse` skill on 2026-06-14. Pills are Pinterest's own related-content
guides shown above the login wall.

- **`born on this day`** → *Queen, Quotes, King, Princess, Diva, Legend.*
  Read: the demand around this phrase skews **famous-people + quotes**. Born pins that name a
  recognizable shared birthday (and, later, a quote angle) will travel further than zodiac-only.
- **`on this day in history`** → *Birthday, Poster, Template, Front page design, Aesthetic, Notes, Background.*
  Read: this audience wants a **designed artifact** — "poster", "front-page", "aesthetic",
  "template". Our branded card art is on-strategy; lean into the poster look.
- **`movies released in 2015`** → *Cinderella, Mustang, Brooklyn, Room, Pan, Fantastic Four, Vacation, Heidi, Legend.*
  Read: people search by **specific title + year**, not just "movies 2015". Release pins
  already list real titles/years (correct). Future expansion: per-title pins for marquee
  anniversaries (e.g. a dedicated "Elden Ring released Feb 25, 2022" pin).

Seeds that gated before rendering pills (need a logged-in pass): `leo personality`,
`taurus personality`, `june facts`, `birthday facts`, `nostalgia 90s`.

## 6. Priority-date posting list

Post these first. Two buckets.

### 6a. Evergreen calendar anchors (always-on, high search every year)
January 1 (New Year), February 14 (Valentine's), March 17 (St. Patrick's), April 1 (April
Fools'), May 4 ("May the 4th"), May 5 (Cinco de Mayo), June 19 (Juneteenth), July 4
(Independence Day), October 31 (Halloween), November 11 (Veterans Day), November 26
(Thanksgiving-area), December 24–25 (Christmas), December 31 (New Year's Eve).
These pull on born + history + observance angles regardless of release data.

### 6b. Recognizable release anniversaries (data-derived, past releases only)
Ranked from the seeded dataset, filtered to releases dated ≤ 2025 and hand-screened for
name recognition:

- **February 25** — Elden Ring (2022)
- **May 12** — The Legend of Zelda: Tears of the Kingdom (2023)
- **August 3** — Baldur's Gate III (2023)
- **July 18** — Demon Slayer: Infinity Castle (2025)
- **December 17** — Avatar: Fire and Ash (2025)
- **February 20** — FROM (2022)
- **October 16** — Fellowship (2025)
- **March 22** — Rita (2024)

> Most other top-popularity days are obscure games (the popularity score is IGDB-heavy). For
> the release board, **hand-pick recognizable anniversaries** rather than posting strictly by
> score — see curation notes.

## 7. Curation notes (issues surfaced during research)

1. **Future releases can lead a release pin.** The dataset's `active` window includes
   upcoming titles (2026–2027) at popularity 100, and `releasePin` does **not** filter to
   `date <= today`. So an evergreen "Released on [day]" pin can currently lead with a film
   that hasn't shipped. For manual posting, skip future-dated lines. Candidate code
   refinement: filter `releasePin` to past dates (or prefer past anniversaries) — out of
   scope for the current plan, flagged for later.
2. **Notability floor.** `RELEASE_PIN_MIN_POP = 50` seeds 344/366 days. Raise it (e.g. 65–70)
   if you want fewer, bigger-title pins; re-seed with `npm run pins:seed -- --force`.
3. **Game-heavy popularity.** Scores favor games over movies/TV. If the release board should
   skew film/TV, weight by vertical when curating.

## 8. How to refine with your account (deeper pass)

When you want full keyword data, do a logged-in pass:
1. Log into Pinterest in your browser.
2. In the search bar, type each seed and **screenshot the autocomplete dropdown** (the
   ordered suggestions are the real volume signal).
3. Open the top 3–5 pins per seed and note their **title pattern, description structure,
   hashtags, and board name** — copy what the winners do.
4. Record anything that differs from §§1–4 here; the code reads these defaults, so update the
   doc and (if needed) the `hashtags`/title strings.

Seeds to run: `born on this day`, `[zodiac] personality`, `on this day in history`,
`[month] facts`, `birthday facts`, `movies released in [year]`, `nostalgia`.
