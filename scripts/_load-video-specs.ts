// scripts/_load-video-specs.ts
// tsx-side loader for src/data/video-pins (the Vite import.meta.glob loader is build-only).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { validateVideoPinSpec } from '../src/lib/video-spec';
import { orderVideoSpecs, type DayVideoSpec } from '../src/lib/video-content';

export function loadVideoSpecsFromDisk(): DayVideoSpec[] {
  const root = path.join(process.cwd(), 'src/data/video-pins');
  const out: DayVideoSpec[] = [];
  if (!existsSync(root)) return out;
  for (const mm of readdirSync(root)) {
    const mmDir = path.join(root, mm);
    if (!statSync(mmDir).isDirectory()) continue;
    for (const dd of readdirSync(mmDir)) {
      const ddDir = path.join(mmDir, dd);
      if (!statSync(ddDir).isDirectory()) continue;
      for (const file of readdirSync(ddDir)) {
        if (!file.endsWith('.json')) continue;
        const full = path.join(ddDir, file);
        const spec = validateVideoPinSpec(JSON.parse(readFileSync(full, 'utf8')), full);
        if (spec.enabled === false) continue;
        out.push({ mm: Number(mm), dd: Number(dd), spec });
      }
    }
  }
  return orderVideoSpecs(out);
}
