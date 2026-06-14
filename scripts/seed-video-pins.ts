// scripts/seed-video-pins.ts
// Writes starter VideoPinSpec files: marquee holidays (effect matched to the date) + bokeh
// ambient for priority dates (docs/pinterest-keyword-strategy.md). All generated:true so a
// re-seed won't clobber curated edits. Default = add-only; --force = overwrite generated files.
//   Run: npm run pins:video:seed
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FORCE = process.argv.includes('--force');
const root = path.join(process.cwd(), 'src/data/video-pins');

// [mm, dd, id, effect, kind, board, kicker, title, line]
const MARQUEE: [number, number, string, string, string, string, string, string, string][] = [
  [1, 1, 'newyear', 'fireworks', 'observance', 'On This Day in History', 'New Year', 'Happy New Year', 'A fresh page in the calendar'],
  [2, 14, 'valentines', 'hearts', 'observance', 'On This Day in History', "Valentine's Day", 'Happy Valentine’s Day', 'Love, through history'],
  [3, 17, 'stpatricks', 'confetti', 'observance', 'On This Day in History', "St. Patrick's Day", 'Happy St. Patrick’s Day', 'A day of parades and luck'],
  [5, 4, 'maythe4th', 'starfield', 'observance', 'On This Day in History', 'May The 4th', 'May the 4th Be With You', 'A galaxy of release-day history'],
  [5, 5, 'cincodemayo', 'confetti', 'observance', 'On This Day in History', 'Cinco De Mayo', 'Happy Cinco de Mayo', 'A day of celebration'],
  [7, 4, 'fireworks', 'fireworks', 'observance', 'On This Day in History', 'Fourth Of July', 'July 4 in History', '1776 · The Declaration of Independence is adopted'],
  [10, 31, 'halloween', 'lightleak', 'observance', 'On This Day in History', 'Halloween', 'Happy Halloween', 'A night of history and lore'],
  [11, 27, 'thanksgiving', 'leaves', 'observance', 'On This Day in History', 'Thanksgiving', 'Happy Thanksgiving', 'Gratitude, season by season'],
  [12, 24, 'christmaseve', 'snow', 'observance', 'On This Day in History', 'Christmas Eve', 'Christmas Eve', 'The night before'],
  [12, 25, 'christmas', 'snow', 'observance', 'On This Day in History', 'Christmas Day', 'Merry Christmas', 'A day of history and wonder'],
  [12, 31, 'nye', 'confetti', 'observance', 'On This Day in History', "New Year's Eve", 'Happy New Year’s Eve', 'One last page of the year'],
];

// Priority release anniversaries (bokeh ambient) — from docs/pinterest-keyword-strategy.md §6b.
// [mm, dd, id, title, line]
const AMBIENT_RELEASE: [number, number, string, string, string][] = [
  [2, 20, 'from', 'Released on February 20', '2022 · FROM'],
  [2, 25, 'eldenring', 'Released on February 25', '2022 · Elden Ring'],
  [3, 22, 'rita', 'Released on March 22', '2024 · Rita'],
  [5, 12, 'zelda-totk', 'Released on May 12', '2023 · The Legend of Zelda: Tears of the Kingdom'],
  [7, 18, 'demonslayer', 'Released on July 18', '2025 · Demon Slayer: Infinity Castle'],
  [8, 3, 'baldursgate3', 'Released on August 3', '2023 · Baldur’s Gate III'],
  [10, 16, 'fellowship', 'Released on October 16', '2025 · Fellowship'],
  [12, 17, 'avatar-fire', 'Released on December 17', '2025 · Avatar: Fire and Ash'],
];

// Fixed-date observances (bokeh ambient) — calendar anchors not covered by a marquee effect.
// [mm, dd, id, kicker, title, line]
const AMBIENT_OBSERVANCE: [number, number, string, string, string, string][] = [
  [2, 2, 'groundhog', 'Groundhog Day', 'Groundhog Day', 'Six more weeks of winter?'],
  [3, 14, 'piday', 'Pi Day', 'Happy Pi Day', '3.14159 · the math the internet loves'],
  [4, 1, 'aprilfools', "April Fools' Day", 'April Fools’ Day', 'Trust nothing you read today'],
  [4, 22, 'earthday', 'Earth Day', 'Happy Earth Day', 'A planet worth celebrating'],
  [6, 19, 'juneteenth', 'Juneteenth', 'Juneteenth', 'Emancipation, remembered'],
  [11, 11, 'veterans', 'Veterans Day', 'Veterans Day', 'Honoring those who served'],
];

function write(mm: number, dd: number, id: string, obj: Record<string, unknown>) {
  const dir = path.join(root, String(mm).padStart(2, '0'), String(dd).padStart(2, '0'));
  const file = path.join(dir, `${id}.json`);
  if (existsSync(file) && !FORCE) { return 'skip'; }
  if (existsSync(file) && FORCE) {
    const cur = JSON.parse(readFileSync(file, 'utf8'));
    if (!cur.generated) return 'skip'; // protect curated edits
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
  return 'write';
}

let written = 0, skipped = 0;
for (const [mm, dd, id, effect, kind, board, kicker, title, line] of MARQUEE) {
  const r = write(mm, dd, id, { id, kind, board, kicker, title, lines: [line], hashtags: ['#OnThisDay', '#OnThisDayInHistory'], effect, generated: true });
  r === 'write' ? written++ : skipped++;
}
for (const [mm, dd, id, title, line] of AMBIENT_RELEASE) {
  const r = write(mm, dd, id, { id, kind: 'release', board: 'Released On This Day', kicker: 'Released On This Day', title, lines: [line], hashtags: ['#OnThisDay', '#PopCulture'], effect: 'bokeh', generated: true });
  r === 'write' ? written++ : skipped++;
}
for (const [mm, dd, id, kicker, title, line] of AMBIENT_OBSERVANCE) {
  const r = write(mm, dd, id, { id, kind: 'observance', board: 'On This Day in History', kicker, title, lines: [line], hashtags: ['#OnThisDay', '#OnThisDayInHistory'], effect: 'bokeh', generated: true });
  r === 'write' ? written++ : skipped++;
}
console.log(`seed-video-pins: written ${written}, skipped ${skipped}`);
