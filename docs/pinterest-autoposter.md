# DateLore — Pinterest auto-poster

Phase-2 of the [distribution engine](distribution-engine-plan.md). A GitHub Action runs
nightly, reads the pin manifest, and creates a small dripped batch of pins via the
Pinterest API — so the channel runs itself once it's set up. Manual posting from
`/pins.json` still works; this just automates it.

## How it works

```
.github/workflows/pinterest.yml  (cron, 15:00 UTC daily)
        │  npx tsx scripts/post-to-pinterest.ts
        ▼
 GET /pins.json (live)  ──▶  selectNextBatch()  ──▶  Pinterest API v5: POST /v5/pins
 (deployed manifest)         (src/lib/pin-schedule)        │
        ▲                                                  ▼
 pinterest-posted.json  ◀────────────  ledger updated, committed back by the Action
```

- **Dedup:** `pinterest-posted.json` (repo root) records every posted pin id
  (`<day>-<kind>`). Each run posts only pins not already in it, so reruns never
  duplicate. The Action commits the updated ledger.
- **Drip:** default **8 pins/run** → all 732 over ~3 months. Bump `PIN_QUOTA` to go faster.
- **Seasonal ordering:** pins whose date is within `PIN_LEAD_DAYS` (default 14) post
  first, nearest date first — so "Born on December 25" goes out ~2 weeks before Dec 25,
  catching the search wave. Everything else marches forward by calendar proximity.
- **Brand safety:** history pins skip violent/disaster/conflict events (see the
  `SENSITIVE` filter in `src/lib/pin-card.ts`) — important now that no human reviews
  each pin before it goes live.

## One-time setup

1. **Create a Pinterest app** at <https://developers.pinterest.com/apps/>. Note the
   **App ID** and **App secret**. Add a redirect URI (use `https://datelore.com/`).
   - New apps start in **trial access**, which permits posting to *your own* account —
     all this needs. If pin creation later returns a permissions error, request
     "standard access" in the app settings.
2. **Get a refresh token** (one time, locally):
   ```bash
   export PINTEREST_APP_ID=...        # PowerShell: $env:PINTEREST_APP_ID="..."
   export PINTEREST_APP_SECRET=...
   npm run pins:auth                  # prints an authorize URL
   # open it, approve, copy the `code` param from the redirected URL, then:
   npm run pins:auth -- <code>        # prints PINTEREST_REFRESH_TOKEN
   ```
3. **Add three GitHub repository secrets** (Settings → Secrets and variables → Actions):
   `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, `PINTEREST_REFRESH_TOKEN`.
4. **Test it safely** from the Actions tab → "Auto-post pins to Pinterest" → Run
   workflow → tick **dry_run** (selects + prints, posts nothing). Then run it for real.

## Knobs

| Env / input | Default | Meaning |
|---|---|---|
| `PIN_QUOTA` | 8 | pins per run |
| `PIN_LEAD_DAYS` | 14 | days-ahead window that posts first |
| `PIN_DRY_RUN` | 0 | `1` = select + print only (no creds, but still fetches the manifest) |
| `PINS_JSON_URL` | `https://datelore.com/pins.json` | manifest source (override for staging) |

Local dry run (no credentials required, fetches the live manifest):
```bash
PIN_DRY_RUN=1 npm run pins:post
```

## Failure behavior (no silent failures)

- Missing secrets / token refresh failure / board-list failure → the run **throws and
  exits non-zero** (visible in the Actions log). Nothing is posted.
- A single pin that fails to create is **logged with its status + body and skipped**; it
  stays out of the ledger and is retried next run. If *every* pin in a batch fails, the
  run exits non-zero so CI surfaces it.
- A corrupt `pinterest-posted.json` aborts the run rather than risk double-posting.

## Boards

The poster maps the manifest's `board` names to your Pinterest boards by name and
**creates them if missing** (`Born On This Day`, `On This Day in History`).
