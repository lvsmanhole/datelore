// tools/video-pins/effects/starfield.mjs
// Seamless starfield: many twinkling stars (sinusoidal opacity) with a slow sinusoidal parallax
// drift, plus a faint orbiting nebula sheen. Night / "May the 4th" backdrop.
import { W, H, TAU, C, makeRng, circle, skyDef, skyRect } from '../brand.mjs';

export const meta = { kind: 'loop' };
const rnd = makeRng(540);
const rr = (a, b) => a + (b - a) * rnd();
const pick = (a) => a[Math.floor(rnd() * a.length)];

const STARS = Array.from({ length: 140 }, () => ({
  x: rr(0, W), y: rr(0, H), r: rr(0.5, 2.2),
  dx: rr(6, 20), dc: pick([1, 2]), dp: rr(0, TAU),
  base: rr(0.2, 0.7), tw: pick([1, 2, 3]), tp: rr(0, TAU),
}));

export function frameSvg(frame, total) {
  const u = frame / total;
  const shx = (520 + 240 * Math.sin(TAU * u)).toFixed(1);
  const shy = (560 + 180 * Math.cos(TAU * u)).toFixed(1);
  let s = '';
  for (const st of STARS) {
    const x = st.x + st.dx * Math.sin(TAU * st.dc * u + st.dp);
    const op = st.base * (0.4 + 0.6 * Math.sin(TAU * st.tw * u + st.tp));
    s += circle(x, st.y, st.r, C.cream, Math.max(0, op));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${skyDef}
<radialGradient id="neb"><stop offset="0" stop-color="#7db4ff" stop-opacity="0.06"/><stop offset="100%" stop-color="#7db4ff" stop-opacity="0"/></radialGradient>
</defs>${skyRect}
<circle cx="${shx}" cy="${shy}" r="520" fill="url(#neb)"/><g>${s}</g>
</svg>`;
}
