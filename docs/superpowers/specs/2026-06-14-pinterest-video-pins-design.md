# Pinterest Video Pins (Phase 2) — Design

> Productionizes the video-pin exploration documented as **Phase 2** in
> `docs/superpowers/specs/2026-06-13-pinterest-daily-pins-design.md` and prototyped in the
> `tools/pin-video-spike/` scratch dir. Static pins (Phase 1) are shipped; this adds an
> offline-rendered, folder-authored **video** pin engine for a curated subset.

## Goal

A "stop in ~5s" hook: short (6s) vertical 1000×1500 MP4s with thematic procedural motion
behind brand text, for a curated set of ~30–40 days (marquee holidays + priority dates).
Posted **manually** (drag the MP4 into Pinterest — no media API, no Standard access). Pinterest
boosts video distribution, so this is a multiplier on the proven static pins, not a replacement.

## Hard constraints (drive the architecture)

1. **Video must never render in the Astro build.** Hundreds of frames × ffmpeg would blow the
   ~7-min static build. All rendering is a separate **offline batch** (`npm run pins:video`),
   run by hand / cron — never `astro build`.
2. **Own-art only.** Same rule as static pins: no third-party images. Effects are procedural
   (Satori/resvg SVG frames). No AI/stock clips ⇒ Pinterest `ai_disclosures` not required.
3. **Manual posting.** No API integration in this phase. The auto-poster's 4-step video media
   flow stays documented (Phase-2 spec) but dormant.
4. **No audio.** Pinterest autoplays muted in-feed; audio adds file size + AI-disclosure
   surface for zero feed benefit.

## Architecture (approach C — split: data/validator/queue in `src/`, render in `tools/`)

Render code lives outside `src/` so it can't be pulled into the Astro build. Data, the pure
validator, and the queue page live in `src/` and reuse the existing brand primitives.

```
src/lib/video-spec.ts            VideoPinSpec type + validateVideoPinSpec() (pure, tested)
src/data/video-pins/<MM>/<DD>/<id>.json   authored video specs (committed)
src/pages/video-pins/index.astro  manual-upload queue (noindex), mirrors /pins/
tools/video-pins/effects/<name>.mjs   procedural effect modules: frameSvg(t) → loop SVG
tools/video-pins/overlay.mjs      transparent brand text card (reuses og-brand palette/mark)
scripts/render-video-pins.ts      offline batch: specs → frames → ffmpeg composite → MP4
video-out/                        rendered MP4s (GITIGNORED — big binaries, like dist/)
docs/video-pins.md                authoring + manual-posting guide
```

Symmetry with the static engine: `video-spec.ts` ≈ `pin-spec.ts`, `render-video-pins.ts` ≈
`seed-release-pins.ts`, `/video-pins/` ≈ `/pins/`.

## Component detail

### 1. `VideoPinSpec` (src/lib/video-spec.ts)
Extends the static `PinSpec` shape (so authoring feels identical) with two fields:

```ts
interface VideoPinSpec extends PinSpec {   // id, board, kicker, title, lines, hashtags, …
  effect: Effect;                          // which procedural background
  durationSec?: number;                    // default 6 (Pinterest 6–15s recommended)
}
type Effect = 'fireworks' | 'snow' | 'hearts' | 'confetti' | 'leaves' | 'starfield' | 'lightleak' | 'bokeh';
```

`validateVideoPinSpec(raw, where)` reuses the static validator's rules (id charset, reserved
ids, board allow-list, 1–3 lines) and adds: `effect` ∈ the allow-list; `durationSec` 4–15 if
present. Pure + unit-tested. `bokeh` is the universal/default ambient effect.

### 2. Effect library (tools/video-pins/effects/*.mjs)
Each effect is a pure `frameSvg(t, durationSec)` returning an SVG string for time `t`.
**Seamless-loop rule:** all motion uses integer-cycle sinusoids over the duration
(`sin(TAU * k * t / DUR)`), so frame[0] == frame[DUR] — a perfect loop (the proven bokeh
trick). Built this cut:
- `fireworks` — port from spike (launch shells, trails, ring/willow/chrysanthemum bursts, smoke).
- `bokeh` — port from spike (gold orbs + stars + orbiting sheen on aubergine).
- `snow` — drifting flakes (parallax layers) for winter holidays.
- `hearts` — rising/pulsing hearts for Valentine's.
- `confetti` — falling/tumbling ribbons for New Year / celebrations.
- `leaves` — falling autumn leaves for fall dates.
- `starfield` — slow-twinkling star drift (night / "May the 4th").
- `lightleak` — warm cinematic gradient sweeps (summer / generic premium).

All share the brand palette (aubergine bg, gold, cream). To avoid coupling to `og-brand.ts`
(which imports satori/resvg and reads fonts at load), the palette + mark SVG are kept as a
small shared `tools/video-pins/brand.mjs` constants module (the spike currently inlines them;
the plan extracts the shared copy). Each effect is unit-tested for valid SVG and loop seamlessness.

### 3. Overlay (tools/video-pins/overlay.mjs)
Transparent 1000×1500 Satori card: brand mark + wordmark, kicker, title, 1–3 lines, foot —
fed from the spec's fields. Carries the spike's **scrim gradients** (top + bottom dark fades)
so text stays legible over busy motion. Rendered once per spec.

### 4. Render batch (scripts/render-video-pins.ts, `npm run pins:video`)
1. Load + validate every `src/data/video-pins/**/*.json` (skip `enabled:false`).
2. For each spec: render `durationSec × FPS` background frames from its `effect`. **Background
   loops are cached by `effect+duration`** and reused across specs — the expensive moving
   background is rendered once per effect, not per day (this is what makes the ambient volume
   cheap). Render the spec's overlay once.
3. ffmpeg composites overlay over the loop: `-c:v libx264 -pix_fmt yuv420p` → `video-out/<day>-<id>.mp4`.
4. Idempotent: skip an existing MP4 unless `--force`. Print `written / skipped / cached-loops`.
Runs under `tsx`; imports `video-spec.ts` (type-only / pure) and the effect/overlay `.mjs`.
Never imported by Astro.

### 5. Queue page (src/pages/video-pins/index.astro, noindex)
Lists each video spec grouped by board: expected MP4 filename, title, description (lines +
hashtags), destination link (UTM `pin-video` campaign via the existing `pinDestination`), and
the static cover PNG. The owner's manual-upload worklist.

### 6. Seed (~30–40, all `generated:true`)
Marquee holidays, effect matched to date:

| Date | Effect | Date | Effect |
|------|--------|------|--------|
| Jan 1 New Year | fireworks | Jul 4 Independence Day | fireworks |
| Feb 14 Valentine's | hearts | Oct 31 Halloween | lightleak |
| Mar 17 St. Patrick's | confetti | late-Nov Thanksgiving | leaves |
| May 4 "May the 4th" | starfield | Dec 24–25 Christmas | snow |
| May 5 Cinco de Mayo | confetti | Dec 31 New Year's Eve | confetti |

Plus `bokeh` ambient specs for the priority dates in `docs/pinterest-keyword-strategy.md`
(recognizable release anniversaries: Elden Ring Feb 25, Zelda TotK May 12, Baldur's Gate III
Aug 3, etc.) and a few high-search birthdays. All seeded files are `generated:true` so re-seed
won't clobber curated edits (same guard as the release seeder). Final list tuned in the plan.

## Output & git
Commit the **specs** (`src/data/video-pins/`), the **render code** (`tools/video-pins/`,
`scripts/render-video-pins.ts`), the **validator/queue/docs**. **Gitignore** `video-out/`
(rendered MP4 binaries) — the specs are the source of truth; anyone can re-render. Consistent
with `dist/` and the spike both being gitignored.

## Testing
- `video-spec.test.ts` — validator accepts a good spec, rejects bad effect / out-of-range
  duration / reserved id / >3 lines.
- `effects.test.ts` — each effect emits valid SVG at `t=0` and `t=DUR`, and is loop-seamless
  (frame at 0 ≈ frame at DUR by a structural/string check).
- One end-to-end render in the plan's final task produces a real MP4; verify with `ffprobe`:
  H.264, yuv420p, 1000×1500, ~6s, > 0 bytes, plays.
- Guard: nothing under `tools/video-pins` or `scripts/render-video-pins.ts` is imported by any
  `src/pages/**` build path.

## Out of scope (deferred)
- Automated API posting (the v5 video media flow) — stays dormant until Standard access.
- AI / licensed-stock photoreal marquee clips (and their `ai_disclosures`).
- Per-effect heavy photoreal (blur-heavy) backgrounds — procedural own-art only here.
- Full 366-day everyday video coverage — this cut is the curated ~30–40 multiplier.

## Open decisions (resolved here)
- Sourcing: **procedural own-art** (no AI) ⇒ no AI-disclosure.
- Audio: **none**.
- Content: **dedicated authored video specs** (not reused static pins).
- Scope: **marquee + priority ambient (~30–40)**.
- Effect library: **8 effects** (fireworks, bokeh, snow, hearts, confetti, leaves, starfield, lightleak).
