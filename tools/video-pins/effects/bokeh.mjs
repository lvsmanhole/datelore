// tools/video-pins/effects/bokeh.mjs
// Seamless gold-bokeh ambient loop: drifting orbs + twinkling stars + an orbiting sheen on
// brand aubergine. All motion is integer-cycle sinusoidal ⇒ frame[0] == frame[total].
// Ported from tools/pin-video-spike/ambient.mjs.
import { W, H, TAU, C, makeRng, circle, skyDef, skyRect } from '../brand.mjs';

export const meta = { kind: 'loop' };

const rnd = makeRng(770613);
const rr = (a, b) => a + (b - a) * rnd();
const pick = (a) => a[Math.floor(rnd() * a.length)];

function makeOrbs(n, rmin, rmax, omin, omax, grad) {
  return Array.from({ length: n }, () => ({
    x: rr(-40, W + 40), y: rr(-40, H + 40), r: rr(rmin, rmax),
    ax: rr(10, 46), ay: rr(14, 58), mx: pick([1, 2]), my: pick([1, 2]),
    px: rr(0, TAU), py: rr(0, TAU), base: rr(omin, omax),
    tw: pick([1, 2]), tp: rr(0, TAU), grad,
  }));
}
const BG = makeOrbs(20, 48, 88, 0.05, 0.11, 'bokDim');
const FG = makeOrbs(42, 10, 36, 0.12, 0.34, 'bok');
const STARS = Array.from({ length: 52 }, () => ({ x: rr(20, W - 20), y: rr(20, H - 20), r: rr(0.6, 1.9), tw: pick([1, 2, 3]), tp: rr(0, TAU), base: rr(0.18, 0.5) }));

function orbSvg(o, u) {
  const x = o.x + o.ax * Math.sin(TAU * o.mx * u + o.px);
  const y = o.y + o.ay * Math.cos(TAU * o.my * u + o.py);
  const op = o.base * (0.62 + 0.38 * Math.sin(TAU * o.tw * u + o.tp));
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${o.r.toFixed(1)}" fill="url(#${o.grad})" opacity="${op.toFixed(3)}"/>`;
}

export function frameSvg(frame, total) {
  const u = frame / total; // normalized 0..1; integer cycles ⇒ seamless
  const shx = (500 + 230 * Math.sin(TAU * u)).toFixed(1);
  const shy = (430 + 130 * Math.cos(TAU * u)).toFixed(1);
  let bg = '', fg = '', st = '';
  for (const o of BG) bg += orbSvg(o, u);
  for (const o of FG) fg += orbSvg(o, u);
  for (const s of STARS) {
    const op = s.base * (0.45 + 0.55 * Math.sin(TAU * s.tw * u + s.tp));
    st += circle(s.x, s.y, s.r, C.cream, op);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${skyDef}
<radialGradient id="bok"><stop offset="0" stop-color="#ffd87a" stop-opacity="1"/><stop offset="55%" stop-color="${C.gold}" stop-opacity="0.45"/><stop offset="100%" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>
<radialGradient id="bokDim"><stop offset="0" stop-color="${C.gold}" stop-opacity="0.8"/><stop offset="100%" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>
<radialGradient id="sheen"><stop offset="0" stop-color="#ffe6a8" stop-opacity="0.055"/><stop offset="100%" stop-color="#ffe6a8" stop-opacity="0"/></radialGradient>
</defs>
${skyRect}
<circle cx="${shx}" cy="${shy}" r="450" fill="url(#sheen)"/>
<g>${bg}</g><g>${st}</g><g>${fg}</g>
</svg>`;
}
