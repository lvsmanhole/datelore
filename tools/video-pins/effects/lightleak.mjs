// tools/video-pins/effects/lightleak.mjs
// Seamless warm light-leak: a few large soft radial blobs drift in sinusoidal ellipses with
// pulsing opacity over brand aubergine — a premium, theme-neutral motion (summer / generic).
import { W, H, TAU, C, makeRng, skyDef, skyRect } from '../brand.mjs';

export const meta = { kind: 'loop' };
const rnd = makeRng(7);
const rr = (a, b) => a + (b - a) * rnd();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const TINTS = ['#ffd87a', '#d8a23f', '#ff9e5e'];

const BLOBS = Array.from({ length: 6 }, (_, i) => ({
  x: rr(120, W - 120), y: rr(160, H - 160), r: rr(280, 460),
  ax: rr(60, 160), ay: rr(80, 220), mx: pick([1, 2]), my: pick([1, 2]),
  px: rr(0, TAU), py: rr(0, TAU), base: rr(0.05, 0.12), tw: pick([1, 2]), tp: rr(0, TAU), id: `ll${i}`,
}));

export function frameSvg(frame, total) {
  const u = frame / total;
  let defs = '', body = '';
  for (const b of BLOBS) {
    const x = b.x + b.ax * Math.sin(TAU * b.mx * u + b.px);
    const y = b.y + b.ay * Math.cos(TAU * b.my * u + b.py);
    const op = b.base * (0.6 + 0.4 * Math.sin(TAU * b.tw * u + b.tp));
    const tint = TINTS[(b.id.charCodeAt(2) || 0) % TINTS.length];
    defs += `<radialGradient id="${b.id}"><stop offset="0" stop-color="${tint}" stop-opacity="${op.toFixed(3)}"/><stop offset="100%" stop-color="${tint}" stop-opacity="0"/></radialGradient>`;
    body += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${b.r.toFixed(0)}" fill="url(#${b.id})"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${skyDef}${defs}</defs>${skyRect}<g>${body}</g>
</svg>`;
}
