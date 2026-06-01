# DateLore — Logo Variants

Decision material for the brand mark used in the **share / OG card** (and as
favicon + square avatar). Six marks, each a production-ready single-colour SVG.

**Preview them:** open [`logo-variants/index.html`](logo-variants/index.html) in a
browser — every mark is shown in the real 1200×630 OG card, as lockups on dark +
parchment, at 32px / 16px favicon, and in single-colour. Quick glance:
[`logo-variants/overview.png`](logo-variants/overview.png).

## The system (locked — not up for redesign here)
The brand identity already ships and these all stay inside it:
- **Type:** Newsreader (display serif) wordmark, `letter-spacing:-.02em`.
- **Colour:** gold `#d8a23f` on aubergine `#2a1622`→`#1d0f17`; cream `#f6f0e3`;
  on parchment use deep gold `#a86f1d` / ink `#2a1622`.
- **Existing DNA:** the `✦` four-point star already in the header wordmark.

Every mark is authored as a **monochrome `currentColor` silhouette**, so it passes
single-colour print, embroidery, foil-stamp and favicon *by construction* — colour
is applied by the context, never baked in.

---

## 01 — Almanac Star
- **Architecture:** Lockup (symbol + wordmark) · favicon-capable symbol.
- **Typography:** Newsreader SemiBold wordmark.
- **Symbol:** Abstract / celestial — the header `✦` formalised into a precise
  four-point north-star with two orbiting spark dots.
- **Colour tokens:** gold `#d8a23f` (dark) / deep gold `#a86f1d` (light) / `#000` / `#fff`.
- **Application notes:** Excellent at every size incl. 16px. The two spark dots can be
  dropped below ~20px for a cleaner favicon. Reverses and single-colours perfectly.
- **Signals:** Continuity. "We are already this brand, only sharper." Celestial/almanac, gentle wonder.
- **Rejects:** Not literal, not heritage-stuffy, not a tech geometric mark. Says nothing
  explicit about *dates* on its own.

## 02 — Day Cell
- **Architecture:** Lockup · favicon-capable symbol.
- **Typography:** Newsreader SemiBold wordmark.
- **Symbol:** Literal — a calendar day-cell with spiral binding; a `✦` star sits where
  the date number would, so the mark never locks to one specific day.
- **Colour tokens:** as above.
- **Application notes:** Reads "a date" instantly at large + mid sizes. At 16px the binding
  rings and star thin out — favicon would simplify to the cell + a dot. Single-colour fine.
- **Signals:** "This is about calendar dates," approachable, utility-meets-charm.
- **Rejects:** Not abstract, not heritage. Risks the generic-calendar-icon trap — the star and
  serif wordmark are what pull it out of cliché.

## 03 — Dawn Sun  ⭐ recommended
- **Architecture:** Symbol-only capable + lockup.
- **Typography:** Newsreader SemiBold wordmark.
- **Symbol:** Literal/atmospheric — a sun cresting the horizon with rays. The most direct
  visual of *"On This Day / a new day,"* and pure old-almanac/ephemeris energy.
- **Colour tokens:** as above.
- **Application notes:** Best small-size silhouette of the set; flawless at 16px, embroidery,
  foil. Natural motion: the sun rises / rays bloom on entry.
- **Signals:** Daily, warm, optimistic, almanac heritage. Matches the card kicker "On This Day."
- **Rejects:** Not a literal calendar, not a monogram. Sun marks are common — distinctiveness
  comes from the half-sun + horizon bar proportion and the warm gold, not novelty.

## 04 — Almanac Seal
- **Architecture:** Monogram in a medallion · strongest in square contexts.
- **Typography:** Newsreader SemiBold "DL" ligature.
- **Symbol:** Monogram — a wax-seal / coin: double ring, DL centre, star ornaments top & bottom,
  tick dots at the sides.
- **Colour tokens:** as above.
- **Application notes:** Superb avatar / profile-picture / foil-stamp mark. Muddies below ~28px —
  needs a fallback (01 or 06) for the 16px favicon. Single-colour fine; reverse fine.
- **Signals:** Authority, heritage, "trusted almanac of record." Collectible, pinnable.
- **Rejects:** Not minimal, not modern-tech. Seals can read old-fashioned — kept modern by the
  clean Newsreader DL and sparse ornament.

## 05 — Date Dial
- **Architecture:** Symbol + lockup.
- **Typography:** Newsreader SemiBold "D" at centre.
- **Symbol:** Abstract gesture — a serif D inside a ring with one dot marking a single day in
  the year's orbit ("today, in the whole year").
- **Colour tokens:** as above.
- **Application notes:** Clean at mid/large; the centred D + ring blur toward 16px. Great motion
  (the dot travels the ring to "today"). Single-colour fine.
- **Signals:** Time, cycle, precision; quietly modern.
- **Rejects:** Not literal, not ornamental. The bare ring + dot can read generic ("loading"/"no")
  without the D — the serif D is doing the disambiguating work.

## 06 — Serif "D" + Star Counter  ⭐ recommended
- **Architecture:** Letterform-as-symbol — the ideal favicon/square fallback for a wordmark brand.
- **Typography:** Custom bold Newsreader-style D.
- **Symbol:** Letterform-derived — a heavy serif **D** whose counter cradles the `✦` brand star.
- **Colour tokens:** as above.
- **Application notes:** Strong at 16px (solid silhouette), embroidery and foil. Below ~18px drop
  the inner star and keep the solid D. Pairs seamlessly with the "DateLore" wordmark.
- **Signals:** Maximum wordmark coherence; the single most *ownable* one-letter mark of the set.
  Fuses "D for Date" with the existing star DNA.
- **Rejects:** Not literal, not a scene. Single-letter marks lean on the wordmark for the full
  name — fine here, since the wordmark always travels in the card.

---

## Recommendation
Two directions carry the brand best in the OG card **and** as a 16px favicon:

1. **03 Dawn Sun** — if you want the mark to *say what the site is* ("On This Day").
   Warmest, best small-size behaviour, on-theme with the card's "On This Day" kicker.
2. **06 Serif D + Star** — if you want a tighter, more *ownable* identity mark that
   leans on the wordmark and folds in the existing ✦.

Suggested production hierarchy (mix is fine):
- **Primary lockup** in the card + header: chosen symbol + `DateLore` wordmark.
- **Favicon / avatar:** the same symbol (03 and 06 both hold at 16px); if **04 Seal**
  is chosen for its richness, fall back to **01** or **06** at favicon size.

## Production / integration notes
The OG card is generated at build time in
[`src/pages/og/[slug].png.ts`](../src/pages/og/[slug].png.ts) via Satori + resvg, and
currently uses a placeholder **"D" in a gold rounded square** (`logoTree()`), plus a
text-only `siteCard()`. Shipping a chosen mark means:
1. Embed the mark as an inline `<svg>`/data-URI in the card tree's top-left brand
   lockup (Satori renders SVG via an `<img>` data-URI) and in `logoTree()`.
2. Swap the header glyph in [`src/components/Header.astro`](../src/components/Header.astro)
   (`.wordmark__mark`) from the literal `✦` to the chosen mark for consistency.
3. Add favicon: export the mark at 32px (gold on aubergine rounded square) →
   `public/favicon.svg` + `.ico`, wire into `BaseLayout.astro` `<head>`.

Marks are pure SVG and colour-agnostic, so no palette work is needed — they inherit
the existing tokens. Next step: pick a direction and I'll produce the refined
production mark + bake it into the OG renderer, header, and favicon.
