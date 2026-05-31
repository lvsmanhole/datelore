import { describe, it, expect } from 'vitest';
import { seedFromDateUTC, pickQuiz, selectQuizForToday, type QuizEvent } from './quiz';

const EVENTS: QuizEvent[] = [
  { year: 1911, title: 'The Titanic is launched' },
  { year: 1859, title: 'Big Ben begins keeping time' },
];

describe('seedFromDateUTC', () => {
  it('is stable for the same UTC calendar day', () => {
    const a = seedFromDateUTC(new Date(Date.UTC(2026, 4, 31, 1, 0)));
    const b = seedFromDateUTC(new Date(Date.UTC(2026, 4, 31, 23, 0)));
    expect(a).toBe(b);
    expect(seedFromDateUTC(new Date(Date.UTC(2026, 5, 1)))).toBe(a + 1);
  });
});

describe('pickQuiz', () => {
  it('is deterministic for a given seed', () => {
    const q1 = pickQuiz(EVENTS, 1234);
    const q2 = pickQuiz(EVENTS, 1234);
    expect(q1).toEqual(q2);
  });

  it('produces 4 distinct options including the correct year', () => {
    const q = pickQuiz(EVENTS, 999);
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain(q.answerYear);
    expect(q.options[q.correctIndex]).toBe(q.answerYear);
  });
});

describe('selectQuizForToday', () => {
  const pool: Record<string, QuizEvent[]> = {
    '05-31': EVENTS,
    '12-25': [{ year: 800, title: 'Charlemagne is crowned emperor' }],
  };

  it("uses today's events when the date is present", () => {
    const q = selectQuizForToday(pool, new Date(Date.UTC(2026, 4, 31)));
    expect([1911, 1859]).toContain(q.answerYear);
  });

  it('falls back to an available date when today is missing', () => {
    const q = selectQuizForToday(pool, new Date(Date.UTC(2026, 2, 15))); // Mar 15, absent
    expect(q.options).toHaveLength(4);
    expect(q.answerYear).toBeGreaterThan(0);
  });

  it('throws only when the pool is entirely empty', () => {
    expect(() => selectQuizForToday({}, new Date())).toThrow();
  });
});
