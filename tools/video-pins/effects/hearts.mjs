// tools/video-pins/effects/hearts.mjs
// Seamless rising hearts: gold/cream hearts float upward with modulo wrap, gentle sway, and a
// soft scale+opacity pulse. Valentine's backdrop.
import { W, H, TAU, C, makeRng, skyDef, skyRect } from '../brand.mjs';

export const meta = { kind: 'loop' };
const rnd = makeRng(21426);
const rr = (a, b) => a + (b - a) * rnd();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const SPAN = H + 120;
// unit heart path (~24px wide), drawn around origin; scaled+translated per instance.
const HEART = 'M0,-3 C4,-9 12,-5 12,2 C12,9 3,14 0,18 C-3,14 -12,9 -12,2 C-12,-5 -4,-9 0,-3 Z';
const COLORS = [C.gold, '#ffd87a', C.cream];

const HEARTS = Array.from({ length: 26 }, () => ({
  x0: rr(40, W - 40), y0: rr(0, SPAN), s: rr(0.7, 2.1), rise: pick([1, 2]),
  sway: rr(14, 40), sc: pick([1, 2]), sp: rr(0, TAU),
  col: pick(COLORS), base: rr(0.4, 0.8), tw: pick([1, 2]), tp: rr(0, TAU),
}));

export function frameSvg(frame, total) {
  const u = frame / total;
  let s = '';
  for (const h of HEARTS) {
    const y = (H + 60) - ((h.y0 + u * h.rise * SPAN) % SPAN);
    const x = h.x0 + h.sway * Math.sin(TAU * h.sc * u + h.sp);
    const sc = h.s * (0.92 + 0.08 * Math.sin(TAU * h.tw * u + h.tp));
    const op = h.base * (0.7 + 0.3 * Math.sin(TAU * h.tw * u + h.tp));
    s += `<path d="${HEART}" fill="${h.col}" opacity="${op.toFixed(3)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(2)})"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${skyDef}</defs>${skyRect}<g>${s}</g>
</svg>`;
}
