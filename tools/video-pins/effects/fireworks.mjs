// tools/video-pins/effects/fireworks.mjs
import { W, H, makeRng, circle } from '../brand.mjs';

export const meta = { kind: 'oneshot' };
const FPS = 30, dt = 1 / FPS, G = 250, TRAIL = 10;
const SKY = '#2a1622', SKY2 = '#0f070c';
const PAL = { red: '#ff5648', white: '#fff3e2', blue: '#7db4ff', gold: '#ffd06a' };
const BURSTS = [
  { t: 0.5, x: 300, y: 520, c: 'gold', n: 90, sp: 310, k: 'willow' },
  { t: 0.8, x: 720, y: 420, c: 'red', n: 72, sp: 340, k: 'chrys' },
  { t: 1.4, x: 500, y: 360, c: 'white', n: 80, sp: 340, k: 'ring' },
  { t: 1.9, x: 230, y: 470, c: 'blue', n: 90, sp: 360, k: 'chrys' },
  { t: 2.2, x: 810, y: 540, c: 'gold', n: 52, sp: 250, k: 'chrys' },
  { t: 2.7, x: 560, y: 400, c: 'red', n: 100, sp: 390, k: 'chrys' },
  { t: 3.2, x: 360, y: 560, c: 'white', n: 70, sp: 330, k: 'ring' },
  { t: 3.5, x: 710, y: 470, c: 'blue', n: 84, sp: 350, k: 'willow' },
  { t: 4.0, x: 470, y: 380, c: 'gold', n: 96, sp: 360, k: 'chrys' },
  { t: 4.5, x: 250, y: 540, c: 'red', n: 70, sp: 320, k: 'chrys' },
  { t: 4.8, x: 770, y: 510, c: 'white', n: 74, sp: 340, k: 'ring' },
  { t: 5.3, x: 540, y: 420, c: 'blue', n: 98, sp: 380, k: 'chrys' },
  { t: 5.6, x: 380, y: 500, c: 'gold', n: 82, sp: 320, k: 'willow' },
];
const easeOut = (x) => 1 - Math.pow(1 - x, 3);

function build() {
  const rnd = makeRng(20260704);
  const rr = (a, b) => a + (b - a) * rnd();
  const stars = Array.from({ length: 70 }, () => ({ x: rr(40, 960), y: rr(70, 760), r: rr(0.6, 1.7), ph: rr(0, 6.3), sp: rr(2, 5) }));
  const smoke = [];
  for (const b of BURSTS) for (let i = 0; i < 4; i++)
    smoke.push({ t: b.t + 0.1, x: b.x + rr(-40, 40), y: b.y + rr(-30, 30), vx: rr(-12, 12), vy: rr(-26, -8), r0: rr(36, 64), life: rr(1.4, 2.0) });
  const pools = BURSTS.map((b) => {
    const parts = [];
    for (let i = 0; i < b.n; i++) {
      const ang = rr(0, Math.PI * 2);
      let speed;
      if (b.k === 'ring') speed = b.sp * rr(0.9, 1.0);
      else if (b.k === 'willow') speed = b.sp * rr(0.45, 0.85);
      else speed = b.sp * Math.sqrt(rnd());
      const life = b.k === 'willow' ? rr(1.9, 2.5) : rr(1.2, 1.8);
      parts.push({ x: b.x, y: b.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life, max: life, col: PAL[b.c], r: rr(2.6, 5.5), drag: b.k === 'willow' ? 0.62 : b.k === 'ring' ? 0.80 : 0.72, ph: rr(0, Math.PI * 2), trail: [] });
    }
    return { b, parts };
  });
  return { rnd, stars, smoke, pools };
}

export function frameSvg(frame /*, total */) {
  const { rnd, stars, smoke, pools } = build();
  for (let f = 0; f <= frame; f++) {            // integrate physics 0..frame
    const time = f / FPS;
    for (const { b, parts } of pools) {
      if (time < b.t) continue;
      for (const p of parts) {
        if (p.life <= 0) continue;
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > TRAIL) p.trail.shift();
        p.vy += G * dt;
        const d = Math.pow(p.drag, dt);
        p.vx *= d; p.vy *= d;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.life -= dt;
      }
    }
  }
  const time = frame / FPS;
  let glow = '', trails = '', cores = '', shells = '', st = '', sm = '', flash = '';
  for (const s of stars) { const a = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(time * s.sp + s.ph)); st += circle(s.x, s.y, s.r, '#f6f0e3', a); }
  for (const s of smoke) { const age = time - s.t; if (age < 0 || age > s.life) continue; const p = age / s.life; sm += circle(s.x + s.vx * age, s.y + s.vy * age, s.r0 + 70 * p, '#6a5560', Math.sin(Math.PI * p) * 0.09); }
  for (const { b } of pools) { const age = time - b.t; if (age < 0 || age > 0.2) continue; const p = age / 0.2; flash += circle(b.x, b.y, 40 + 200 * p, PAL[b.c], (1 - p) * 0.5); flash += circle(b.x, b.y, 20 + 90 * p, '#fff3e2', (1 - p) * 0.6); }
  for (const { b } of pools) {
    const t0 = b.t - 0.6; if (time < t0 || time >= b.t) continue; const p = easeOut((time - t0) / 0.6);
    const sx = b.x + (b.x - 500) * 0.04 * (1 - p); const sy = 1480 + (b.y - 1480) * p;
    for (let i = 0; i < 6; i++) { const pp = Math.max(0, p - i * 0.025); const ty = 1480 + (b.y - 1480) * pp; const tx = b.x + (b.x - 500) * 0.04 * (1 - pp); shells += circle(tx, ty, 4.5 - i * 0.5, PAL.gold, (1 - i / 6) * 0.5 * (1 - p)); }
    shells += circle(sx, sy, 5, '#fff3e2', 0.9 * (1 - p * 0.3));
  }
  for (const { b, parts } of pools) {
    if (time < b.t) continue;
    for (const p of parts) {
      if (p.life <= 0) continue;
      const fade = Math.pow(Math.max(0, p.life / p.max), 0.7);
      const flick = 0.6 + 0.4 * Math.abs(Math.sin(time * 26 + p.ph));
      const glit = rnd() > 0.975 ? 1.7 : 1;
      const a = fade * flick * glit;
      for (let k = 0; k < p.trail.length; k++) { const tp = p.trail[k], fr = (k + 1) / p.trail.length; trails += circle(tp.x, tp.y, p.r * 0.75 * fr, p.col, fade * fr * 0.4); }
      glow += circle(p.x, p.y, p.r * 2.7, p.col, Math.min(1, a) * 0.4);
      cores += circle(p.x, p.y, p.r, p.col, Math.min(1, a));
      if (p.life > p.max * 0.6) cores += circle(p.x, p.y, p.r * 0.5, '#ffffff', Math.min(1, a) * 0.9);
      if (glit > 1) cores += circle(p.x, p.y, p.r * 0.7, '#ffffff', Math.min(1, fade));
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<radialGradient id="sky" cx="0.5" cy="0.38" r="0.75"><stop offset="0" stop-color="${SKY}"/><stop offset="1" stop-color="${SKY2}"/></radialGradient>
<filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="sm" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="34"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g>${st}</g><g filter="url(#sm)">${sm}</g><g filter="url(#b)">${glow}${flash}</g><g>${trails}</g><g>${shells}</g><g>${cores}</g>
</svg>`;
}
