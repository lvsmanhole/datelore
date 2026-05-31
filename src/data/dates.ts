// The day dataset. Built from the committed per-date JSON in ./days/, produced
// offline by scripts/fetch-wikimedia.ts (Wikimedia "On this day", CC BY-SA).
// Vite inlines these JSON modules at build time — there are NO runtime API calls.
import type { DayEntry } from './types';

const modules = import.meta.glob<DayEntry>('./days/*.json', {
  eager: true,
  import: 'default',
});

export const DATES: Record<string, DayEntry> = {};
for (const path in modules) {
  // "./days/05-31.json" -> "05-31"
  const key = path.slice(path.lastIndexOf('/') + 1).replace(/\.json$/, '');
  DATES[key] = modules[path];
}

export type {
  DayEntry,
  DayEvent,
  DayBirth,
  DayDeath,
  DayObservance,
} from './types';
