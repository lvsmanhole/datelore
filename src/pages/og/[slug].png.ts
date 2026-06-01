// Build-time OG/share image generation. One static endpoint emits a PNG per day
// (/og/may-31.png), per month (/og/may.png), the site default (/og/home.png) and
// a square brand logo (/og/logo.png). Satori turns a flexbox node tree into SVG
// (text is outlined to paths, so resvg needs no fonts) and resvg rasterizes it.
//
// Runs only during `astro build` (static output) — there is no runtime cost.
import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DATES } from '../../data/dates.js';
import { MONTHS, toSlug, monthName } from '../../lib/slug';
import { dayCard, monthCard, siteCard, type CardText } from '../../lib/og-card';

// Fonts are read from the source tree at build time (cwd === project root during
// `astro build`), which is robust to Vite bundling moving import.meta.url around.
const FONT_DIR = path.join(process.cwd(), 'src/assets/fonts');
const FONT_REGULAR = readFileSync(path.join(FONT_DIR, 'Newsreader-Regular.ttf'));
const FONT_SEMIBOLD = readFileSync(path.join(FONT_DIR, 'Newsreader-SemiBold.ttf'));
const FONTS = [
  { name: 'Newsreader', data: FONT_REGULAR, weight: 400 as const, style: 'normal' as const },
  { name: 'Newsreader', data: FONT_SEMIBOLD, weight: 600 as const, style: 'normal' as const },
];

// Brand palette converted from the site's OKLCH tokens to hex (Satori needs hex/rgb).
const C = {
  bg: '#2a1622', // --aubergine-2
  bg2: '#1d0f17',
  cream: '#f6f0e3', // --on-dark
  gold: '#d8a23f', // --gold
  sub: 'rgba(246,240,227,0.82)',
  border: 'rgba(216,162,63,0.45)',
};

type RenderProps =
  | { kind: 'day'; key: string }
  | { kind: 'month'; month: number }
  | { kind: 'site' }
  | { kind: 'logo' };

export function getStaticPaths() {
  const paths: { params: { slug: string }; props: RenderProps }[] = [];
  for (const key of Object.keys(DATES)) {
    paths.push({ params: { slug: toSlug(key) }, props: { kind: 'day', key } });
  }
  for (let m = 1; m <= 12; m++) {
    paths.push({ params: { slug: MONTHS[m - 1].toLowerCase() }, props: { kind: 'month', month: m } });
  }
  paths.push({ params: { slug: 'home' }, props: { kind: 'site' } });
  paths.push({ params: { slug: 'logo' }, props: { kind: 'logo' } });
  return paths;
}

// Minimal hyperscript so we don't need a JSX runtime — Satori reads {type, props}.
type Node = { type: string; props: { style: Record<string, unknown>; children?: unknown } };
const box = (style: Record<string, unknown>, children?: unknown): Node => ({ type: 'div', props: { style, children } });

function cardTree(card: CardText): Node {
  return box(
    {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '78px 84px',
      backgroundColor: C.bg,
      backgroundImage: `linear-gradient(135deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      color: C.cream,
      fontFamily: 'Newsreader',
      position: 'relative',
    },
    [
      // gold inner frame
      box({
        position: 'absolute',
        top: '30px',
        left: '30px',
        width: '1140px',
        height: '570px',
        border: `2px solid ${C.border}`,
        borderRadius: '20px',
      }),
      box({ display: 'flex', fontSize: '30px', letterSpacing: '7px', color: C.gold, fontWeight: 600 }, card.kicker.toUpperCase()),
      box({ display: 'flex', flexDirection: 'column' }, [
        box({ display: 'flex', fontSize: '118px', fontWeight: 600, lineHeight: 1.0 }, card.title),
        box({ display: 'flex', fontSize: '42px', color: C.sub, lineHeight: 1.32, marginTop: '24px' }, card.subtitle),
      ]),
      box({ display: 'flex', fontSize: '26px', letterSpacing: '5px', color: C.gold }, card.foot.toUpperCase()),
    ],
  );
}

function logoTree(): Node {
  return box(
    {
      width: '512px',
      height: '512px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.bg,
      color: C.cream,
      fontFamily: 'Newsreader',
    },
    [
      box(
        {
          display: 'flex',
          width: '136px',
          height: '136px',
          borderRadius: '32px',
          backgroundColor: C.gold,
          color: C.bg,
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '92px',
          fontWeight: 600,
        },
        'D',
      ),
      box({ display: 'flex', fontSize: '70px', fontWeight: 600, marginTop: '26px' }, 'DateLore'),
    ],
  );
}

async function toPng(tree: Node, size: number): Promise<Buffer> {
  const width = size === 512 ? 512 : 1200;
  const height = size === 512 ? 512 : 630;
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], { width, height, fonts: FONTS });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  return png;
}

function cardFor(props: RenderProps): CardText {
  if (props.kind === 'day') {
    const [mm, dd] = props.key.split('-').map(Number);
    return dayCard(monthName(mm), dd, DATES[props.key]);
  }
  if (props.kind === 'month') return monthCard(monthName(props.month));
  return siteCard();
}

export const GET: APIRoute = async ({ props }) => {
  const p = props as RenderProps;
  const png = p.kind === 'logo' ? await toPng(logoTree(), 512) : await toPng(cardTree(cardFor(p)), 1200);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
