// Deterministic "which year did it happen?" daily quiz. Same UTC day -> same
// puzzle for everyone (spec §8). Pure + unit-tested; reused by the client.

export interface QuizEvent { year: number; title: string; }
export interface Quiz {
  question: string;
  options: number[];   // 4 distinct years
  correctIndex: number;
  answerYear: number;
  title: string;
}

/** Days since the Unix epoch in UTC — the global "question of the day" seed. */
export function seedFromDateUTC(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
}

// Tiny deterministic LCG so the chosen event, distractors, and order are stable
// for a given seed.
function lcg(seed: number): () => number {
  let s = (((seed % 2_147_483_647) + 2_147_483_647) % 2_147_483_647) || 1;
  return () => (s = (s * 48_271) % 2_147_483_647) / 2_147_483_647;
}

/** Build a puzzle from a day's events. Requires events.length >= 1. */
export function pickQuiz(events: QuizEvent[], seed: number): Quiz {
  if (events.length === 0) throw new Error('pickQuiz needs at least one event');
  const rand = lcg(seed);
  const ev = events[Math.floor(rand() * events.length)];
  const correct = ev.year;

  const offsets = [1, -1, 2, -2, 3, -3, 5, -5, 7, -7, 10, -10, 4, -4, 6, -6];
  const distractors: number[] = [];
  for (const off of offsets) {
    const cand = correct + off;
    if (cand > 0 && cand !== correct && !distractors.includes(cand)) distractors.push(cand);
    if (distractors.length === 3) break;
  }

  const options = [correct, ...distractors];
  for (let i = options.length - 1; i > 0; i--) { // seeded Fisher–Yates
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    question: `In which year did this happen: ${ev.title}?`,
    options,
    correctIndex: options.indexOf(correct),
    answerYear: correct,
    title: ev.title,
  };
}

/**
 * Pick the puzzle for `refDate` (interpreted in UTC) from a pool keyed by
 * "MM-DD". Prefers today's events; otherwise deterministically falls back to an
 * available date so there is always a valid puzzle (spec §8).
 */
export function selectQuizForToday(pool: Record<string, QuizEvent[]>, refDate: Date): Quiz {
  const seed = seedFromDateUTC(refDate);
  const mm = String(refDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(refDate.getUTCDate()).padStart(2, '0');
  let events = pool[`${mm}-${dd}`];
  if (!events || events.length === 0) {
    const keys = Object.keys(pool).filter((k) => pool[k] && pool[k].length > 0).sort();
    if (keys.length === 0) throw new Error('quiz pool has no events');
    events = pool[keys[seed % keys.length]];
  }
  return pickQuiz(events, seed);
}
