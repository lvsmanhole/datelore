// tools/video-pins/effects/leaves.mjs
// Seamless falling autumn leaves: rotated ellipses (warm palette) drift down with modulo wrap,
// wider sinusoidal sway, and slow tumble. Fall / Thanksgiving backdrop.
import { W, H, TAU, C, makeRng, skyDef, skyRect } from '../brand.mjs';

export const meta = { kind: 'loop' };
const rnd = makeRng(1110);
const rr = (a, b) => a + (b - a) * rnd();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const SPAN = H + 80;
const COLORS = ['#d8a23f', '#c0622a', '#9a3b1f', '#e0a64a'];

const LEAVES = Array.from({ length: 40 }, () => ({
  x0: rr(0, W), y0: rr(0, SPAN), rx: rr(7, 14), ry: rr(14, 26),
  fall: pick([1, 2]), sway: rr(30, 70), sc: pick([1, 2]), sp: rr(0, TAU),
  spin: pick([1, 2]), rp: rr(0, 360), col: pick(COLORS), base: rr(0.5, 0.85),
}));

export function frameSvg(frame, total) {
  const u = frame / total;
  let s = '';
  for (const l of LEAVES) {
    const y = ((l.y0 + u * l.fall * SPAN) % SPAN) - 40;
    const x = l.x0 + l.sway * Math.sin(TAU * l.sc * u + l.sp);
    const rot = (l.rp + 360 * l.spin * u) % 360;
    s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})" opacity="${l.base.toFixed(3)}"><ellipse cx="0" cy="0" rx="${l.rx.toFixed(1)}" ry="${l.ry.toFixed(1)}" fill="${l.col}"/><line x1="0" y1="${(-l.ry).toFixed(1)}" x2="0" y2="${l.ry.toFixed(1)}" stroke="#5a2a14" stroke-width="1" opacity="0.5"/></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${skyDef}</defs>${skyRect}<g>${s}</g>
</svg>`;
}
