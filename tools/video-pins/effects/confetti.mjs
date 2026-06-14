// tools/video-pins/effects/confetti.mjs
// Seamless falling confetti ribbons: rectangles tumble down with modulo wrap, sinusoidal sway,
// and integer-cycle rotation. Celebration backdrop (New Year, Cinco de Mayo).
import { W, H, TAU, C, makeRng, skyDef, skyRect } from '../brand.mjs';

export const meta = { kind: 'loop' };
const rnd = makeRng(101);
const rr = (a, b) => a + (b - a) * rnd();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const SPAN = H + 60;
const COLORS = [C.gold, '#ffd87a', C.cream, '#ff5648', '#7db4ff'];

const BITS = Array.from({ length: 70 }, () => ({
  x0: rr(0, W), y0: rr(0, SPAN), w: rr(8, 16), h: rr(14, 28),
  fall: pick([1, 2]), sway: rr(16, 44), sc: pick([1, 2]), sp: rr(0, TAU),
  spin: pick([1, 2, 3]), rp: rr(0, 360), col: pick(COLORS), base: rr(0.55, 0.9),
}));

export function frameSvg(frame, total) {
  const u = frame / total;
  let s = '';
  for (const b of BITS) {
    const y = ((b.y0 + u * b.fall * SPAN) % SPAN) - 30;
    const x = b.x0 + b.sway * Math.sin(TAU * b.sc * u + b.sp);
    const rot = (b.rp + 360 * b.spin * u) % 360;
    s += `<rect x="${(-b.w / 2).toFixed(1)}" y="${(-b.h / 2).toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}" rx="2" fill="${b.col}" opacity="${b.base.toFixed(3)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${skyDef}</defs>${skyRect}<g>${s}</g>
</svg>`;
}
