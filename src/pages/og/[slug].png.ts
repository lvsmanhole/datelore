// Build-time OG/share image generation. One static endpoint emits a PNG per day
// (/og/may-31.png), per month (/og/may.png), the site default (/og/home.png) and
// a square brand logo (/og/logo.png). Brand palette, the Dawn Sun mark, fonts, the
// hyperscript, and rasterization are shared with the pin generator via ./og-brand.
//
// Runs only during `astro build` (static output) — there is no runtime cost.
import type { APIRoute } from 'astro';
import { DATES } from '../../data/dates.js';
import { MONTHS, toSlug, monthName } from '../../lib/slug';
import { dayCard, monthCard, siteCard, releasesCard, type CardText } from '../../lib/og-card';
import { C, MARK_URI, box, img, renderPng, type Node } from '../../lib/og-brand';

type RenderProps =
  | { kind: 'day'; key: string }
  | { kind: 'month'; month: number }
  | { kind: 'site' }
  | { kind: 'releases' }
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
  paths.push({ params: { slug: 'releases' }, props: { kind: 'releases' } });
  paths.push({ params: { slug: 'logo' }, props: { kind: 'logo' } });
  return paths;
}

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
      // brand lockup — Dawn Sun mark + wordmark
      box({ display: 'flex', alignItems: 'center' }, [
        img(MARK_URI, 64),
        box({ display: 'flex', fontSize: '42px', fontWeight: 600, color: C.cream, marginLeft: '18px' }, 'DateLore'),
      ]),
      // headline block — eyebrow over title over subtitle
      box({ display: 'flex', flexDirection: 'column' }, [
        box({ display: 'flex', fontSize: '30px', letterSpacing: '7px', color: C.gold, fontWeight: 600 }, card.kicker.toUpperCase()),
        box({ display: 'flex', fontSize: '118px', fontWeight: 600, lineHeight: 1.0, marginTop: '14px' }, card.title),
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
      img(MARK_URI, 210),
      box({ display: 'flex', fontSize: '70px', fontWeight: 600, marginTop: '18px' }, 'DateLore'),
    ],
  );
}

function cardFor(props: RenderProps): CardText {
  if (props.kind === 'day') {
    const [mm, dd] = props.key.split('-').map(Number);
    return dayCard(monthName(mm), dd, DATES[props.key]);
  }
  if (props.kind === 'month') return monthCard(monthName(props.month));
  if (props.kind === 'releases') return releasesCard();
  return siteCard();
}

export const GET: APIRoute = async ({ props }) => {
  const p = props as RenderProps;
  const png = p.kind === 'logo'
    ? await renderPng(logoTree(), 512, 512)
    : await renderPng(cardTree(cardFor(p)), 1200, 630);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
