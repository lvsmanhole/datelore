// tools/video-pins/effects/snow.mjs
// Seamless drifting snow: two parallax layers of flakes falling with modulo wrap + sinusoidal
// sway and twinkle, on brand aubergine. Calm winter-holiday backdrop.
import { W, H, TAU, C, makeRng, circle, skyDef, skyRect } from '../brand.mjs';

export const meta = { kind: 'loop' };
const rnd = makeRng(122524);
const rr = (a, b) => a + (b - a) * rnd();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const SPAN = H + 80;

function makeFlakes(n, rmin, rmax, omin, omax) {
  return Array.from({ length: n }, () => ({
    x0: rr(0, W), y0: rr(0, SPAN), r: rr(rmin, rmax),
    fall: pick([1, 2]), sway: rr(8, 26), sc: pick([1, 2]), sp: rr(0, TAU),
    base: rr(omin, omax), tw: pick([1, 2]), tp: rr(0, TAU),
  }));
}
const FAR = makeFlakes(60, 1.2, 2.6, 0.18, 0.4);
const NEAR = makeFlakes(34, 3, 6.5, 0.5, 0.85);

function layer(flakes, u) {
  let s = '';
  for (const fl of flakes) {
    const y = ((fl.y0 + u * fl.fall * SPAN) % SPAN) - 40;
    const x = fl.x0 + fl.sway * Math.sin(TAU * fl.sc * u + fl.sp);
    const op = fl.base * (0.7 + 0.3 * Math.sin(TAU * fl.tw * u + fl.tp));
    s += circle(x, y, fl.r, C.cream, op);
  }
  return s;
}

export function frameSvg(frame, total) {
  const u = frame / total;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${skyDef}</defs>${skyRect}
<g opacity="0.7">${layer(FAR, u)}</g><g>${layer(NEAR, u)}</g>
</svg>`;
}
