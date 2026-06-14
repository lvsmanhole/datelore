// tools/video-pins/overlay.mjs
// Transparent 1000×1500 brand text card composited over the moving background by ffmpeg.
// Top + bottom scrim gradients keep text legible over busy motion. Fed from overlay text
// ({ kicker, title, lines, foot, attribution? }). Loads fonts + brand mark here (Satori needs them).
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { W, H, C } from './brand.mjs';

const FONT_DIR = path.join(process.cwd(), 'src/assets/fonts');
const FONTS = [
  { name: 'Newsreader', data: readFileSync(path.join(FONT_DIR, 'Newsreader-Regular.ttf')), weight: 400, style: 'normal' },
  { name: 'Newsreader', data: readFileSync(path.join(FONT_DIR, 'Newsreader-SemiBold.ttf')), weight: 600, style: 'normal' },
];
const MARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><g stroke="#d8a23f" stroke-width="7" stroke-linecap="round">' +
  '<line x1="60" y1="14" x2="60" y2="30"/><line x1="28" y1="30" x2="38" y2="40"/><line x1="92" y1="30" x2="82" y2="40"/>' +
  '<line x1="12" y1="60" x2="26" y2="60"/><line x1="108" y1="60" x2="94" y2="60"/></g>' +
  '<path d="M32 80 a28 28 0 0 1 56 0 Z" fill="#d8a23f"/><rect x="10" y="88" width="100" height="9" rx="4.5" fill="#d8a23f"/></svg>';
const MARK_URI = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString('base64')}`;
const box = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });
const img = (src, size) => ({ type: 'img', props: { src, width: size, height: size, style: { width: `${size}px`, height: `${size}px` } } });

export function overlayTree(text) {
  return box({ width: `${W}px`, height: `${H}px`, position: 'relative', fontFamily: 'Newsreader' }, [
    box({ position: 'absolute', top: '0', left: '0', width: `${W}px`, height: '300px', backgroundImage: 'linear-gradient(180deg, rgba(15,7,12,0.72) 0%, rgba(15,7,12,0) 100%)' }),
    box({ position: 'absolute', top: '690px', left: '0', width: `${W}px`, height: '810px', backgroundImage: 'linear-gradient(180deg, rgba(15,7,12,0) 0%, rgba(15,7,12,0.88) 42%, rgba(15,7,12,0.97) 100%)' }),
    box({ position: 'absolute', top: '36px', left: '36px', width: '928px', height: '1428px', border: `2px solid ${C.border}`, borderRadius: '24px' }),
    box({ position: 'absolute', top: '0', left: '0', width: `${W}px`, height: `${H}px`, flexDirection: 'column', justifyContent: 'space-between', padding: '92px 80px', color: C.cream }, [
      box({ alignItems: 'center' }, [img(MARK_URI, 72), box({ fontSize: '52px', fontWeight: 600, color: C.cream, marginLeft: '20px' }, 'DateLore')]),
      box({ flexDirection: 'column', marginBottom: '40px' }, [
        box({ fontSize: '34px', letterSpacing: '8px', color: C.gold, fontWeight: 600 }, text.kicker.toUpperCase()),
        box({ fontSize: '92px', fontWeight: 600, lineHeight: 1.04, marginTop: '22px' }, text.title),
        box({ flexDirection: 'column', marginTop: '30px' },
          text.lines.map((l) => box({ fontSize: '44px', color: C.sub, lineHeight: 1.3, marginTop: '14px' }, l))),
        ...(text.attribution ? [box({ fontSize: '24px', color: C.sub, marginTop: '28px' }, text.attribution)] : []),
        box({ fontSize: '30px', letterSpacing: '6px', color: C.gold, marginTop: '40px' }, text.foot.toUpperCase()),
      ]),
    ]),
  ]);
}

export async function renderOverlayPng(text) {
  const svg = await satori(overlayTree(text), { width: W, height: H, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}
