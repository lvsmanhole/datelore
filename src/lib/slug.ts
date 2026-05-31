// Pure helpers mapping between "MM-DD" data keys and readable URL slugs, plus
// the calendar math the day pages need. No DOM, no Astro — fully unit-tested.

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const MONTH_SLUGS = MONTHS.map((m) => m.toLowerCase());

// Days per month for a NON-leap year (index 0 = January).
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** "05-31" -> "may-31" (the canonical URL slug, spec §5.1). */
export function toSlug(key: string): string {
  const [mm, dd] = key.split('-');
  return `${MONTH_SLUGS[parseInt(mm, 10) - 1]}-${parseInt(dd, 10)}`;
}

/** Build a slug straight from numbers, e.g. slugFromParts(5, 31) -> "may-31". */
export function slugFromParts(month: number, day: number): string {
  return `${MONTH_SLUGS[month - 1]}-${day}`;
}

/** "may-31" -> "05-31" (zero-padded data key), or null if not a real date. */
export function fromSlug(slug: string): string | null {
  const idx = slug.lastIndexOf('-');
  if (idx < 0) return null;
  const month = MONTH_SLUGS.indexOf(slug.slice(0, idx)) + 1;
  const day = parseInt(slug.slice(idx + 1), 10);
  if (month < 1 || !Number.isInteger(day) || day < 1) return null;
  const max = month === 2 ? 29 : DAYS_IN_MONTH[month - 1]; // allow Feb 29
  if (day > max) return null;
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function monthName(month: number): string {
  return MONTHS[month - 1];
}

/** Ordinal day-of-year using NON-leap counting; Feb 29 resolves to 60. */
export function dayOfYear(month: number, day: number): number {
  let total = day;
  for (let m = 0; m < month - 1; m++) total += DAYS_IN_MONTH[m];
  return total;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Sort "MM-DD" keys into calendar order. */
export function sortKeysByDate(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const [am, ad] = a.split('-').map(Number);
    const [bm, bd] = b.split('-').map(Number);
    return dayOfYear(am, ad) - dayOfYear(bm, bd);
  });
}
