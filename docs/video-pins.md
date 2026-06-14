# DateLore Video Pins — authoring, rendering & manual posting

## What this is
Phase-2 video pins: short branded MP4s with procedural motion for a curated set of days.
Authored as JSON under `src/data/video-pins/<MM>/<DD>/<id>.json`, rendered offline to
`video-out/` (gitignored), and posted by hand. Static pins (Phase 1) are unaffected.

## Author a video pin
1. Create `src/data/video-pins/<MM>/<DD>/<id>.json` (zero-padded). Example:
   ```json
   { "id": "fireworks", "kind": "observance", "board": "On This Day in History",
     "kicker": "Fourth Of July", "title": "July 4 in History",
     "lines": ["1776 · The Declaration of Independence is adopted"],
     "hashtags": ["#FourthOfJuly"], "effect": "fireworks" }
   ```
   - `effect` ∈ `fireworks · bokeh · snow · hearts · confetti · leaves · starfield · lightleak`.
   - `board` ∈ `Born On This Day · On This Day in History · Released On This Day`.
   - 1–3 `lines`. Optional `durationSec` (4–15, default 6). `enabled:false` hides it.

## Render
- `npm run pins:video` — render new specs (add-only) → `video-out/<day>-<id>.mp4`.
- `npm run pins:video -- --force` — re-render everything.
Requires `ffmpeg` on PATH. Background loops are cached per effect, so the ambient set is cheap.

## Post (manual)
1. Open `/video-pins/` for the worklist (title, description, link, board, MP4 filename).
2. In Pinterest, create a pin, upload the MP4 from `video-out/`, paste the title + description,
   set the destination link, choose the board. **No API or Standard access needed for manual upload.**

## Re-seed starter specs
- `npm run pins:video:seed` — add-only.
- `npm run pins:video:seed -- --force` — refresh `generated:true` files; leaves curated edits.

## Automation (later)
The v5 video media flow (register → S3 upload → poll → create with cover) stays documented in
the Phase-2 design but dormant; manual upload sidesteps it.
