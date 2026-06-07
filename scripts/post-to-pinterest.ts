// Pinterest auto-poster. Reads the pin manifest (src/lib/pins-manifest), selects the
// next dripped batch (src/lib/pin-schedule), and creates pins via the Pinterest API v5.
// Tracks posted pins in pinterest-posted.json so each run posts only new ones. Run on a
// cron by .github/workflows/pinterest.yml; get the refresh token via scripts/pinterest-auth.ts.
//
// Env:
//   PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN  (required for a real run)
//   PIN_QUOTA       max pins per run (default 8)
//   PIN_LEAD_DAYS   prioritize dates within N days ahead (default 14)
//   PIN_DRY_RUN     '1' → select + print only; no network, no creds, no ledger write
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { PinManifestEntry } from '../src/lib/pins-manifest';
import { selectNextBatch, pinId } from '../src/lib/pin-schedule';

const API = 'https://api.pinterest.com/v5';
const TOKEN_URL = `${API}/oauth/token`;
const LEDGER = path.join(process.cwd(), 'pinterest-posted.json');
// Fetch the LIVE manifest (not rebuilt locally): guarantees every pin's image is
// actually deployed and reachable for Pinterest to fetch, and avoids importing the
// Vite-only data module (import.meta.glob) into this plain-Node script.
const MANIFEST_URL = process.env.PINS_JSON_URL ?? 'https://datelore.com/pins.json';

const QUOTA = Number(process.env.PIN_QUOTA ?? '8');
const LEAD_DAYS = Number(process.env.PIN_LEAD_DAYS ?? '14');
const DRY_RUN = process.env.PIN_DRY_RUN === '1';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Ledger { posted: string[]; updated?: string }

function loadLedger(): Ledger {
  if (!existsSync(LEDGER)) return { posted: [] };
  try {
    const l = JSON.parse(readFileSync(LEDGER, 'utf8')) as Ledger;
    return { posted: Array.isArray(l.posted) ? l.posted : [] };
  } catch (e) {
    throw new Error(`Corrupt ${path.basename(LEDGER)} — refusing to run (would risk double-posting): ${e}`);
  }
}
function saveLedger(posted: string[]) {
  writeFileSync(LEDGER, JSON.stringify({ posted, updated: new Date().toISOString() }, null, 2) + '\n');
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

async function fetchManifest(): Promise<PinManifestEntry[]> {
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error(`Fetch manifest failed (${res.status}) from ${MANIFEST_URL}`);
  const json: any = await res.json().catch(() => ({}));
  if (!Array.isArray(json.pins) || json.pins.length === 0) throw new Error(`Manifest at ${MANIFEST_URL} has no pins[]`);
  return json.pins as PinManifestEntry[];
}

async function accessToken(): Promise<string> {
  const basic = Buffer.from(`${requireEnv('PINTEREST_APP_ID')}:${requireEnv('PINTEREST_APP_SECRET')}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: requireEnv('PINTEREST_REFRESH_TOKEN') });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(`Token refresh failed (${res.status}): ${JSON.stringify(json)}`);
  return json.access_token as string;
}

async function boardMap(token: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let bookmark = '';
  do {
    const url = `${API}/boards?page_size=100${bookmark ? `&bookmark=${encodeURIComponent(bookmark)}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`List boards failed (${res.status}): ${JSON.stringify(json)}`);
    for (const b of json.items ?? []) map.set(b.name, b.id);
    bookmark = json.bookmark ?? '';
  } while (bookmark);
  return map;
}

async function createBoard(token: string, name: string): Promise<string> {
  const res = await fetch(`${API}/boards`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, privacy: 'PUBLIC' }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Create board "${name}" failed (${res.status}): ${JSON.stringify(json)}`);
  return json.id as string;
}

async function createPin(token: string, boardId: string, p: PinManifestEntry): Promise<void> {
  const res = await fetch(`${API}/pins`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      board_id: boardId,
      title: p.title.slice(0, 100),
      description: p.description.slice(0, 500),
      link: p.link,
      media_source: { source_type: 'image_url', url: p.image },
    }),
  });
  if (!res.ok) throw new Error(`Create pin ${pinId(p)} failed (${res.status}): ${await res.text().catch(() => '')}`);
}

async function main() {
  const manifest = await fetchManifest();
  const ledger = loadLedger();
  const now = new Date();
  const batch = selectNextBatch({
    manifest,
    posted: ledger.posted,
    todayMonth: now.getUTCMonth() + 1,
    todayDay: now.getUTCDate(),
    quota: QUOTA,
    leadDays: LEAD_DAYS,
  });

  console.log(`Manifest ${manifest.length} · posted ${ledger.posted.length} · this run ${batch.length} (quota ${QUOTA}, lead ${LEAD_DAYS}d)`);
  if (batch.length === 0) { console.log('Nothing new to post.'); return; }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would post:');
    for (const p of batch) console.log(`  - ${pinId(p)} → "${p.title}" → board "${p.board}"\n      ${p.link}`);
    return;
  }

  const token = await accessToken();
  const boards = await boardMap(token);
  for (const name of new Set(batch.map((p) => p.board))) {
    if (!boards.has(name)) { console.log(`Creating board "${name}"…`); boards.set(name, await createBoard(token, name)); }
  }

  let ok = 0;
  const failures: string[] = [];
  for (const p of batch) {
    try {
      await createPin(token, boards.get(p.board)!, p);
      ledger.posted.push(pinId(p));
      ok++;
      console.log(`  ✅ ${pinId(p)}`);
      await sleep(1500); // gentle drip, well under rate limits
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(msg);
      console.warn(`  ❌ ${msg}`); // failed pins stay out of the ledger → retried next run
    }
  }

  if (ok > 0) {
    saveLedger(ledger.posted);
    console.log(`\nPosted ${ok}/${batch.length}. Ledger now ${ledger.posted.length} of ${manifest.length}.`);
    return;
  }

  // Nothing posted — don't write the ledger (avoids spurious empty commits).
  console.log(`\nPosted 0/${batch.length}. Nothing recorded.`);
  const allTrial = failures.length > 0 && failures.every((f) => /Trial access|"code"\s*:\s*29/i.test(f));
  if (allTrial) {
    console.warn(
      'All pins blocked by Pinterest Trial access (code 29). The app needs STANDARD access ' +
        '(see docs/pinterest-autoposter.md). Exiting 0 — the cron will auto-resume once approved.',
    );
    return;
  }
  console.error('Every pin failed (non-trial errors) — exiting non-zero so CI surfaces it.');
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
