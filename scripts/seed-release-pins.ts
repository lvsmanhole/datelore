// scripts/seed-release-pins.ts
// Writes one src/data/pins/<MM>/<DD>/release.json per qualifying day from the release
// calendar. Run via tsx (releases.ts uses static JSON imports, not import.meta.glob, so it
// works here). Modes: default = add-only (skip existing); --force = overwrite seeded files
// (generated:true) only; --force-all = overwrite everything including curated edits.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadReleases, releasesForDayPage } from '../src/lib/releases';
import { releasePin } from '../src/lib/release-pin';

const FORCE = process.argv.includes('--force');
const FORCE_ALL = process.argv.includes('--force-all');
const root = path.join(process.cwd(), 'src/data/pins');
const releases = loadReleases();

let written = 0, skipped = 0, sparse = 0;
for (let mm = 1; mm <= 12; mm++) {
  for (let dd = 1; dd <= 31; dd++) {
    const dayReleases = releasesForDayPage(releases, mm, dd).flatMap((g) => g.releases);
    const spec = releasePin(mm, dd, dayReleases);
    if (!spec) { sparse++; continue; }
    const dir = path.join(root, String(mm).padStart(2, '0'), String(dd).padStart(2, '0'));
    const file = path.join(dir, `${spec.id}.json`);
    if (existsSync(file) && !FORCE_ALL) {
      if (!FORCE) { skipped++; continue; }
      const cur = JSON.parse(readFileSync(file, 'utf8'));
      if (!cur.generated) { skipped++; continue; } // protect curated edits
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(spec, null, 2) + '\n');
    written++;
  }
}
console.log(`seed-release-pins: written ${written}, skipped ${skipped}, sparse(no-pin) ${sparse}`);
