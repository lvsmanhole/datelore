// scripts/render-video-pins.ts
// Offline batch: render authored video specs to 1000×1500 MP4s. NEVER run in the Astro build.
// For each spec: render the effect's frames (background loops CACHED per effect+duration and
// reused across specs), render the spec's transparent overlay once, then ffmpeg-composite the
// overlay over the looping background. Modes: default = skip existing; --force = re-render all.
//   Run: npm run pins:video    (or: npx tsx scripts/render-video-pins.ts --force)
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Resvg } from '@resvg/resvg-js';
import { loadVideoSpecsFromDisk } from './_load-video-specs';
import { videoSpecToOverlayText } from '../src/lib/video-content';
import { renderOverlayPng } from '../tools/video-pins/overlay.mjs';
import { EFFECTS_REGISTRY } from '../tools/video-pins/effects/index.mjs';
import { slugFromParts } from '../src/lib/slug';

const FPS = 30;
const FORCE = process.argv.includes('--force');
const root = process.cwd();
const outDir = path.join(root, 'video-out');
const workRoot = path.join(root, 'video-out', '.work');
mkdirSync(outDir, { recursive: true });

// Render (or reuse) a cached background frame sequence for an effect+duration.
const cachedLoops = new Set<string>();
function renderBackground(effect: string, durationSec: number): string {
  const total = durationSec * FPS;
  const key = `${effect}-${durationSec}`;
  const dir = path.join(workRoot, key);
  if (cachedLoops.has(key)) return dir;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const mod = (EFFECTS_REGISTRY as Record<string, { frameSvg: (f: number, t: number) => string }>)[effect];
  for (let f = 0; f < total; f++) {
    const png = new Resvg(mod.frameSvg(f, total), { fitTo: { mode: 'width', value: 1000 } }).render().asPng();
    writeFileSync(path.join(dir, `f-${String(f).padStart(4, '0')}.png`), png);
  }
  cachedLoops.add(key);
  return dir;
}

async function main() {
  const specs = loadVideoSpecsFromDisk();
  let written = 0, skipped = 0;
  for (const { mm, dd, spec } of specs) {
    const daySlug = slugFromParts(mm, dd);
    const out = path.join(outDir, `${daySlug}-${spec.id}.mp4`);
    if (existsSync(out) && !FORCE) { skipped++; continue; }
    const dur = spec.durationSec ?? 6;
    const total = dur * FPS;
    const bgDir = renderBackground(spec.effect, dur);
    const overlayPng = await renderOverlayPng(videoSpecToOverlayText(spec));
    const overlayPath = path.join(workRoot, `overlay-${daySlug}-${spec.id}.png`);
    writeFileSync(overlayPath, overlayPng);
    // Single overlay frame: the overlay filter's default eof_action=repeat applies it to every
    // background frame. -frames:v hard-caps output to exactly the loop length so the encode
    // terminates deterministically (a -loop 1 overlay input is unbounded and -shortest did not
    // cap it under ffmpeg 8.1.1 — it ran away, so we cap output frames explicitly).
    execFileSync('ffmpeg', [
      '-y', '-framerate', String(FPS), '-i', path.join(bgDir, 'f-%04d.png'),
      '-i', overlayPath,
      '-filter_complex', '[0:v][1:v]overlay=0:0,format=yuv420p',
      '-frames:v', String(total),
      '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      out,
    ], { stdio: 'ignore' });
    rmSync(overlayPath, { force: true });
    written++;
    process.stdout.write(`  rendered ${daySlug}-${spec.id} (${spec.effect})\n`);
  }
  rmSync(workRoot, { recursive: true, force: true });
  console.log(`render-video-pins: written ${written}, skipped ${skipped}, cached-loops ${cachedLoops.size}`);
}
main();
