// Build-time Pinterest pin generation. Emits two vertical 1000×1500 PNGs per day:
//   /pin/may-31-born.png      ("Born on May 31?")
//   /pin/may-31-history.png   ("May 31 in History")
// plus one PNG per authored folder pin (src/data/pins/<MM>/<DD>/<id>.json), e.g.
//   /pin/june-13-release.png  ("Released on June 13")
// Pins use DateLore's OWN branded card art (no third-party images) so a pin can never
// break the way a hotlinked game cover might. The Satori node tree is shared via
// ../../lib/pin-tree. Runs only during `astro build`.
import type { APIRoute } from 'astro';
import { DATES } from '../../data/dates.js';
import { toSlug, monthName, slugFromParts } from '../../lib/slug';
import { renderPng } from '../../lib/og-brand';
import { bornPin, historyPin } from '../../lib/pin-card';
import { pinTree } from '../../lib/pin-tree';
import { loadPinSpecs, pinSpecToText } from '../../lib/pin-content';
import type { PinSpec } from '../../lib/pin-spec';

type PinProps = { kind: 'born' | 'history'; key: string } | { kind: 'folder'; spec: PinSpec };

export function getStaticPaths() {
  const paths: { params: { slug: string }; props: PinProps }[] = [];
  for (const key of Object.keys(DATES)) {
    const slug = toSlug(key);
    paths.push({ params: { slug: `${slug}-born` }, props: { kind: 'born', key } });
    paths.push({ params: { slug: `${slug}-history` }, props: { kind: 'history', key } });
  }
  for (const { mm, dd, spec } of loadPinSpecs()) {
    paths.push({ params: { slug: `${slugFromParts(mm, dd)}-${spec.id}` }, props: { kind: 'folder', spec } });
  }
  return paths;
}

export const GET: APIRoute = async ({ props }) => {
  const p = props as PinProps;
  let pin;
  if (p.kind === 'folder') {
    pin = pinSpecToText(p.spec);
  } else {
    const [mm, dd] = p.key.split('-').map(Number);
    const entry = DATES[p.key];
    pin = p.kind === 'born' ? bornPin(monthName(mm), mm, dd, entry) : historyPin(monthName(mm), dd, entry);
  }
  const png = await renderPng(pinTree(pin), 1000, 1500);
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
