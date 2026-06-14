// tools/video-pins/brand.mjs
// Shared constants for the procedural effects. Pure (no fs/font load) so effects + tests
// import it freely. The overlay (overlay.mjs) loads fonts + the brand mark separately.
export const W = 1000, H = 1500, FPS = 30;
export const TAU = Math.PI * 2;
export const C = {
  bg: '#2a1622', bg2: '#140a11', cream: '#f6f0e3', gold: '#d8a23f',
  sub: 'rgba(246,240,227,0.9)', border: 'rgba(216,162,63,0.45)',
};
// Deterministic LCG so every render of an effect is byte-identical (⇒ cacheable + loopable).
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
export const circle = (x, y, r, fill, op) =>
  `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${op.toFixed(3)}"/>`;
export const skyRect = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
export const skyDef = `<radialGradient id="sky" cx="0.5" cy="0.4" r="0.85"><stop offset="0" stop-color="${C.bg}"/><stop offset="1" stop-color="${C.bg2}"/></radialGradient>`;
