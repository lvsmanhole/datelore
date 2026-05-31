import { zodiacForDate, chineseZodiacForYear, generationForYear } from './reference';
import { ordinal, monthName } from './slug';

export interface BirthdayInput { year: number; month: number; day: number; } // month 1-12
export interface BirthdayStats {
  years: number;
  totalDays: number;
  totalHours: number;
  weekday: string;
  zodiac: string;      // "♊ Gemini"
  chinese: string;     // "Year of the Horse"
  generation: string;
  daysToNext: number;  // 0 == today
  pretty: string;      // "May 31st, 1990"
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Parse "YYYY-MM-DD" -> BirthdayInput, or null if malformed / not a real date. */
export function parseBirthdate(value: string): BirthdayInput | null {
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const year = +parts[0], month = +parts[1], day = +parts[2];
  if (![year, month, day].every(Number.isInteger)) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return { year, month, day };
}

/**
 * Pure birthday math. `now` is injected so the function is deterministic and
 * unit-testable. Returns null if the birthdate is in the future.
 */
export function computeBirthday(input: BirthdayInput, now: Date): BirthdayStats | null {
  const birth = new Date(input.year, input.month - 1, input.day);
  if (birth.getTime() > now.getTime()) return null;

  let years = now.getFullYear() - input.year;
  const hadBirthday =
    now.getMonth() > input.month - 1 ||
    (now.getMonth() === input.month - 1 && now.getDate() >= input.day);
  if (!hadBirthday) years--;

  const ms = now.getTime() - birth.getTime();
  const totalDays = Math.floor(ms / 86_400_000);
  const totalHours = Math.floor(ms / 3_600_000);

  // Next birthday. JS rolls Feb 29 to Mar 1 in common years, which is fine.
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), input.month - 1, input.day);
  if (next.getTime() < todayMidnight.getTime()) {
    next = new Date(now.getFullYear() + 1, input.month - 1, input.day);
  }
  const daysToNext = Math.round((next.getTime() - todayMidnight.getTime()) / 86_400_000);

  const z = zodiacForDate(input.month, input.day);

  return {
    years,
    totalDays,
    totalHours,
    weekday: WEEKDAYS[birth.getDay()],
    zodiac: `${z.glyph} ${z.sign}`,
    chinese: `Year of the ${chineseZodiacForYear(input.year)}`,
    generation: generationForYear(input.year),
    daysToNext,
    pretty: `${monthName(input.month)} ${ordinal(input.day)}, ${input.year}`,
  };
}
