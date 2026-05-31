// Offline data pipeline: fetch the Wikimedia "On this day" feed for all 366
// month-days ONCE, transform/clean it (pure, tested code), and bake one JSON
// file per date into src/data/days/. The baked JSON is committed as the source
// of truth so production builds are reproducible and never hit a live API.
//
// Run:  npx tsx scripts/fetch-wikimedia.ts
//
// Data: Wikimedia REST "On this day" — CC BY-SA. Attribution is required and is
// built into the page templates + footer.
import { mkdir, writeFile } from 'node:fs/promises';
import { transformDay, type WmFeed } from '../src/lib/transform';

const UA = 'DateLore/0.1 (https://datelore.com; tailormade.gibson@gmail.com)';
const OUT = 'src/data/days';
// Days per month INCLUDING Feb 29, so the leap-day page exists (spec §8).
const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const pad = (n: number) => String(n).padStart(2, '0');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchDay(m: number, d: number, attempt = 1): Promise<WmFeed> {
  const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/${pad(m)}/${pad(d)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as WmFeed;
  } catch (err) {
    if (attempt <= 4) {
      await sleep(600 * attempt); // back off, then retry
      return fetchDay(m, d, attempt + 1);
    }
    throw err;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let ok = 0;
  const failed: string[] = [];
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= DAYS[m - 1]; d++) {
      const key = `${pad(m)}-${pad(d)}`;
      try {
        const raw = await fetchDay(m, d);
        const entry = transformDay(raw, m, d);
        await writeFile(`${OUT}/${key}.json`, JSON.stringify(entry));
        ok++;
        if (ok % 30 === 0) console.log(`  …${ok} days written (latest ${key})`);
      } catch (err) {
        failed.push(key);
        console.error(`FAIL ${key}: ${(err as Error).message}`);
      }
      await sleep(120); // be polite to the API
    }
  }
  console.log(
    `Done. ${ok} written, ${failed.length} failed` +
      (failed.length ? `: ${failed.join(', ')}` : '') +
      '.',
  );
  if (failed.length) process.exitCode = 1;
}

main();
