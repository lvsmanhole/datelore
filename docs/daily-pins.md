# DateLore Daily Pins — authoring & manual posting

## What this is
Born/history pins generate automatically. Extra pins (starting with the evergreen
"Released on this day") live as JSON files under `src/data/pins/<MM>/<DD>/<id>.json` and
flow into `/pins.json` and the `/pins/` posting queue.

## Add a pin by hand
1. Create `src/data/pins/<MM>/<DD>/<id>.json` (zero-padded month/day). Example:
   ```json
   { "id": "birthday-spotlight", "kind": "birthday", "board": "Born On This Day",
     "kicker": "Born On This Day", "title": "Famous June 13 Birthdays",
     "lines": ["James Clerk Maxwell (1831)", "Ban Ki-moon (1944)"],
     "hashtags": ["#Birthday", "#OnThisDay"] }
   ```
   - `id` is `[a-z0-9-]`, unique per day, and must not be `born`/`history`.
   - `board` must be one of: `Born On This Day`, `On This Day in History`, `Released On This Day`.
   - 1–3 `lines`. `enabled: false` hides a pin without deleting it.
2. The build renders `/pin/<month>-<day>-<id>.png` and adds it to `/pins.json` and `/pins/`.

## Post (manual mode, current)
1. Open `/pins/` (or `/pins.json`).
2. For each pin: upload its image, paste the title + description, set the destination link,
   choose the board. Start with the priority dates in `docs/pinterest-keyword-strategy.md`.
3. Boards must exist on Pinterest first (create "Released On This Day" by hand).

> Video pins: upload the MP4 by hand in Pinterest's UI — no API or Standard access needed.

## Re-seed release pins
- `npm run pins:seed` — add-only (won't touch existing files).
- `npm run pins:seed -- --force` — refresh seeded (`generated:true`) files; leaves curated edits.
- `npm run pins:seed -- --force-all` — overwrite everything (escape hatch).

## Automation (later)
The auto-poster (`scripts/post-to-pinterest.ts` + `.github/workflows/pinterest.yml`) is built
but dormant; it reads the same `/pins.json` and resumes once Pinterest Standard access is granted.
