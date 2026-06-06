// Build-time Pinterest pin generation. Emits two vertical 1000×1500 PNGs per day:
//   /pin/may-31-born.png      ("Born on May 31?")
//   /pin/may-31-history.png   ("May 31 in History")
// Pins use DateLore's OWN branded card art (no third-party images) so a pin can never
// break the way a hotlinked game cover might. Brand primitives are shared with the OG
// generator via ../../lib/og-brand. Runs only during `astro build`.
import type { APIRoute } from 'astro';
import { DATES } from '../../data/dates.js';
import { toSlug, monthName } from '../../lib/slug';
import { C, MARK_URI, box, img, renderPng, type Node } from '../../lib/og-brand';
import { bornPin, historyPin, type PinText } from '../../lib/pin-card';

type PinProps = { key: string; kind: 'born' | 'history' };

export function getStaticPaths() {
  const paths: { params: { slug: string }; props: PinProps }[] = [];
  for (const key of Object.keys(DATES)) {
    const slug = toSlug(key);
    paths.push({ params: { slug: `${slug}-born` }, props: { key, kind: 'born' } });
    paths.push({ params: { slug: `${slug}-history` }, props: { key, kind: 'history' } });
  }
  return paths;
}

function pinTree(pin: PinText): Node {
  return box(
    {
      width: '1000px',
      height: '1500px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '92px 80px',
      backgroundColor: C.bg,
      backgroundImage: `linear-gradient(160deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      color: C.cream,
      fontFamily: 'Newsreader',
      position: 'relative',
    },
    [
      // gold inner frame
      box({
        position: 'absolute',
        top: '36px',
        left: '36px',
        width: '928px',
        height: '1428px',
        border: `2px solid ${C.border}`,
        borderRadius: '24px',
      }),
      // brand lockup — Dawn Sun mark + wordmark
      box({ display: 'flex', alignItems: 'center' }, [
        img(MARK_URI, 72),
        box({ display: 'flex', fontSize: '52px', fontWeight: 600, color: C.cream, marginLeft: '20px' }, 'DateLore'),
      ]),
      // headline block — eyebrow over title over supporting lines
      box({ display: 'flex', flexDirection: 'column' }, [
        box({ display: 'flex', fontSize: '34px', letterSpacing: '8px', color: C.gold, fontWeight: 600 }, pin.kicker.toUpperCase()),
        box({ display: 'flex', fontSize: '96px', fontWeight: 600, lineHeight: 1.04, marginTop: '22px' }, pin.title),
        box(
          { display: 'flex', flexDirection: 'column', marginTop: '44px' },
          pin.lines.map((l) => box({ display: 'flex', fontSize: '44px', color: C.sub, lineHeight: 1.3, marginTop: '18px' }, l)),
        ),
      ]),
      // foot — optional attribution above the brand rule
      box({ display: 'flex', flexDirection: 'column' }, [
        ...(pin.attribution
          ? [box({ display: 'flex', fontSize: '24px', color: C.sub, marginBottom: '16px' }, pin.attribution)]
          : []),
        box({ display: 'flex', fontSize: '30px', letterSpacing: '6px', color: C.gold }, pin.foot.toUpperCase()),
      ]),
    ],
  );
}

export const GET: APIRoute = async ({ props }) => {
  const { key, kind } = props as PinProps;
  const [mm, dd] = key.split('-').map(Number);
  const entry = DATES[key];
  const pin = kind === 'born' ? bornPin(monthName(mm), mm, dd, entry) : historyPin(monthName(mm), dd, entry);
  const png = await renderPng(pinTree(pin), 1000, 1500);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
