// src/lib/pin-tree.ts
// The Satori node tree for a vertical 1000×1500 pin. Extracted from the pin route so it can
// be reused (born/history + folder pins) and unit-tested. Pure: takes a PinText, returns a Node.
import { C, MARK_URI, box, img, type Node } from './og-brand';
import type { PinText } from './pin-card';

export function pinTree(pin: PinText): Node {
  return box(
    {
      width: '1000px', height: '1500px', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '92px 80px', backgroundColor: C.bg,
      backgroundImage: `linear-gradient(160deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      color: C.cream, fontFamily: 'Newsreader', position: 'relative',
    },
    [
      box({ position: 'absolute', top: '36px', left: '36px', width: '928px', height: '1428px', border: `2px solid ${C.border}`, borderRadius: '24px' }),
      box({ display: 'flex', alignItems: 'center' }, [
        img(MARK_URI, 72),
        box({ display: 'flex', fontSize: '52px', fontWeight: 600, color: C.cream, marginLeft: '20px' }, 'DateLore'),
      ]),
      box({ display: 'flex', flexDirection: 'column' }, [
        box({ display: 'flex', fontSize: '34px', letterSpacing: '8px', color: C.gold, fontWeight: 600 }, pin.kicker.toUpperCase()),
        box({ display: 'flex', fontSize: '96px', fontWeight: 600, lineHeight: 1.04, marginTop: '22px' }, pin.title),
        box(
          { display: 'flex', flexDirection: 'column', marginTop: '44px' },
          pin.lines.map((l) => box({ display: 'flex', fontSize: '44px', color: C.sub, lineHeight: 1.3, marginTop: '18px' }, l)),
        ),
      ]),
      box({ display: 'flex', flexDirection: 'column' }, [
        ...(pin.attribution ? [box({ display: 'flex', fontSize: '24px', color: C.sub, marginBottom: '16px' }, pin.attribution)] : []),
        box({ display: 'flex', fontSize: '30px', letterSpacing: '6px', color: C.gold }, pin.foot.toUpperCase()),
      ]),
    ],
  );
}
