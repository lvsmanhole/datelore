// Shared brand primitives for build-time Satori image generation (OG cards + pins).
// Single source of truth for palette, the Dawn Sun mark, fonts, the minimal
// hyperscript, and rasterization — so OG and pin generators can't drift apart.
//
// Runs only during `astro build` (static output) — no runtime cost.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Fonts are read from the source tree at build time (cwd === project root during
// `astro build`), which is robust to Vite bundling moving import.meta.url around.
const FONT_DIR = path.join(process.cwd(), 'src/assets/fonts');
export const FONTS = [
  { name: 'Newsreader', data: readFileSync(path.join(FONT_DIR, 'Newsreader-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Newsreader', data: readFileSync(path.join(FONT_DIR, 'Newsreader-SemiBold.ttf')), weight: 600 as const, style: 'normal' as const },
];

// Brand palette converted from the site's OKLCH tokens to hex (Satori needs hex/rgb).
export const C = {
  bg: '#2a1622', // --aubergine-2
  bg2: '#1d0f17',
  cream: '#f6f0e3', // --on-dark
  gold: '#d8a23f', // --gold
  sub: 'rgba(246,240,227,0.82)',
  border: 'rgba(216,162,63,0.45)',
};

// Brand mark — "Dawn Sun" (a sun cresting the horizon = "On This Day"). Embedded as
// a base64 <img> data-URI so Satori rasterizes it as a standalone image; gold is
// baked in because currentColor does not resolve inside an <img>. Master source:
// design/logo-variants/mark-03-dawn-sun.svg.
const MARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
  '<g stroke="#d8a23f" stroke-width="7" stroke-linecap="round">' +
  '<line x1="60" y1="14" x2="60" y2="30"/><line x1="28" y1="30" x2="38" y2="40"/>' +
  '<line x1="92" y1="30" x2="82" y2="40"/><line x1="12" y1="60" x2="26" y2="60"/>' +
  '<line x1="108" y1="60" x2="94" y2="60"/></g>' +
  '<path d="M32 80 a28 28 0 0 1 56 0 Z" fill="#d8a23f"/>' +
  '<rect x="10" y="88" width="100" height="9" rx="4.5" fill="#d8a23f"/></svg>';
export const MARK_URI = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString('base64')}`;

// Minimal hyperscript so we don't need a JSX runtime — Satori reads {type, props}.
export type Node = { type: string; props: { style: Record<string, unknown>; children?: unknown } };
export const box = (style: Record<string, unknown>, children?: unknown): Node => ({ type: 'div', props: { style, children } });
export const img = (src: string, size: number) => ({
  type: 'img',
  props: { src, width: size, height: size, style: { width: `${size}px`, height: `${size}px` } },
});

/** Render a Satori node tree to a PNG buffer at the given pixel size. */
export async function renderPng(tree: Node, width: number, height: number): Promise<Buffer> {
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], { width, height, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
}
