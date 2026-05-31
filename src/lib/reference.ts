// Typed reference tables — DateLore's own hand-authored data (not from
// Wikimedia). Pure lookups, unit-tested.

export interface Zodiac { sign: string; glyph: string; }

const ZODIAC: { sign: string; glyph: string; from: [number, number]; to: [number, number] }[] = [
  { sign: 'Capricorn',   glyph: '♑', from: [12, 22], to: [1, 19] },
  { sign: 'Aquarius',    glyph: '♒', from: [1, 20],  to: [2, 18] },
  { sign: 'Pisces',      glyph: '♓', from: [2, 19],  to: [3, 20] },
  { sign: 'Aries',       glyph: '♈', from: [3, 21],  to: [4, 19] },
  { sign: 'Taurus',      glyph: '♉', from: [4, 20],  to: [5, 20] },
  { sign: 'Gemini',      glyph: '♊', from: [5, 21],  to: [6, 20] },
  { sign: 'Cancer',      glyph: '♋', from: [6, 21],  to: [7, 22] },
  { sign: 'Leo',         glyph: '♌', from: [7, 23],  to: [8, 22] },
  { sign: 'Virgo',       glyph: '♍', from: [8, 23],  to: [9, 22] },
  { sign: 'Libra',       glyph: '♎', from: [9, 23],  to: [10, 22] },
  { sign: 'Scorpio',     glyph: '♏', from: [10, 23], to: [11, 21] },
  { sign: 'Sagittarius', glyph: '♐', from: [11, 22], to: [12, 21] },
];

export function zodiacForDate(month: number, day: number): Zodiac {
  for (const z of ZODIAC) {
    if ((month === z.from[0] && day >= z.from[1]) ||
        (month === z.to[0] && day <= z.to[1])) {
      return { sign: z.sign, glyph: z.glyph };
    }
  }
  return { sign: ZODIAC[0].sign, glyph: ZODIAC[0].glyph }; // Capricorn fallback
}

const CHINESE = ['Monkey', 'Rooster', 'Dog', 'Pig', 'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat'];
export function chineseZodiacForYear(year: number): string {
  return CHINESE[((year % 12) + 12) % 12];
}

export function generationForYear(year: number): string {
  if (year <= 1927) return 'Greatest Generation';
  if (year <= 1945) return 'Silent Generation';
  if (year <= 1964) return 'Baby Boomer';
  if (year <= 1980) return 'Generation X';
  if (year <= 1996) return 'Millennial';
  if (year <= 2012) return 'Generation Z';
  return 'Generation Alpha';
}

const BIRTHSTONES = ['Garnet', 'Amethyst', 'Aquamarine', 'Diamond', 'Emerald', 'Pearl', 'Ruby', 'Peridot', 'Sapphire', 'Opal', 'Topaz', 'Turquoise'];
export function birthstoneForMonth(month: number): string { return BIRTHSTONES[month - 1]; }

const BIRTH_FLOWERS = ['Carnation', 'Violet', 'Daffodil', 'Daisy', 'Lily of the Valley', 'Rose', 'Larkspur', 'Gladiolus', 'Aster', 'Marigold', 'Chrysanthemum', 'Holly'];
export function birthFlowerForMonth(month: number): string { return BIRTH_FLOWERS[month - 1]; }
