// DateLore — client interaction layer. Pure logic lives in ../lib (unit-tested);
// this file only does DOM wiring. Progressive enhancement: every feature is
// opt-in via data-attributes, so a page without the hooks still renders fine.
import { parseBirthdate, computeBirthday, type BirthdayStats } from '../lib/birthday';
import { selectQuizForToday, type QuizEvent } from '../lib/quiz';
import { slugFromParts, monthName, daySlugFromISO } from '../lib/slug';

function fmtNum(n: number): string { return n.toLocaleString('en-US'); }

function setOut(scope: ParentNode, key: string, value: string): void {
  const el = scope.querySelector<HTMLElement>(`[data-bday-out="${key}"]`);
  if (el) el.textContent = value;
}

/* ----------------------------------------------------------- birthday calc */
function renderBirthday(scope: ParentNode, stats: BirthdayStats): void {
  setOut(scope, 'years', fmtNum(stats.years));
  setOut(scope, 'days', fmtNum(stats.totalDays));
  setOut(scope, 'hours', fmtNum(stats.totalHours));
  setOut(scope, 'weekday', stats.weekday);
  setOut(scope, 'zodiac', stats.zodiac);
  setOut(scope, 'chinese', stats.chinese);
  setOut(scope, 'generation', stats.generation);
  setOut(scope, 'countdown', stats.daysToNext === 0 ? 'Today!' : fmtNum(stats.daysToNext));
  setOut(scope, 'pretty', stats.pretty);
  const results = scope.querySelector<HTMLElement>('[data-bday-results]');
  if (results) results.hidden = false;
}

function wireBirthday(): void {
  document.querySelectorAll<HTMLFormElement>('[data-bday-form]').forEach((form) => {
    const input = form.querySelector<HTMLInputElement>('[data-bday-input]');
    const scope: ParentNode = form.closest('[data-bday-scope]') ?? document;
    if (!input) return;
    // Bound the native picker to a sane range: nothing in the future, nothing absurdly old.
    input.max = new Date().toISOString().slice(0, 10);
    if (!input.min) input.min = '1900-01-01';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const parsed = parseBirthdate(input.value);
      const stats = parsed ? computeBirthday(parsed, new Date()) : null;
      const err = scope.querySelector<HTMLElement>('[data-bday-error]');
      if (!stats) {
        input.setAttribute('aria-invalid', 'true');
        if (err) err.hidden = false;
        return;
      }
      input.setAttribute('aria-invalid', 'false');
      if (err) err.hidden = true;
      renderBirthday(scope, stats);
    });
  });
}

/* ------------------------------------------------------------------- quiz */
function streakKey(id: string): string { return `datelore:streak:${id}`; }
function getStreak(id: string): number {
  try { return parseInt(localStorage.getItem(streakKey(id)) || '0', 10) || 0; }
  catch { return 0; }
}
function setStreak(id: string, n: number): void {
  try { localStorage.setItem(streakKey(id), String(n)); } catch { /* ignore */ }
}

function readQuizPool(quiz: Element): Record<string, QuizEvent[]> | null {
  const tag = quiz.querySelector<HTMLScriptElement>('[data-quiz-pool]');
  if (!tag || !tag.textContent) return null;
  try { return JSON.parse(tag.textContent) as Record<string, QuizEvent[]>; }
  catch { return null; }
}

function wireQuiz(): void {
  document.querySelectorAll<HTMLElement>('[data-quiz]').forEach((quiz) => {
    const id = quiz.getAttribute('data-quiz') || 'daily';
    const streakEl = quiz.querySelector<HTMLElement>('[data-quiz-streak]');
    if (streakEl) streakEl.textContent = String(getStreak(id));

    // If a pool is embedded, compute today's puzzle and (re)render question +
    // options. Otherwise the server-rendered fallback markup stands.
    const pool = readQuizPool(quiz);
    const opts = Array.from(quiz.querySelectorAll<HTMLButtonElement>('[data-quiz-opt]'));
    if (pool) {
      try {
        const puzzle = selectQuizForToday(pool, new Date());
        const q = quiz.querySelector<HTMLElement>('[data-quiz-q]');
        if (q) q.textContent = puzzle.question;
        opts.forEach((opt, i) => {
          const label = opt.querySelector<HTMLElement>('[data-quiz-opt-label]') ?? opt;
          label.textContent = String(puzzle.options[i]);
          opt.setAttribute('data-correct', String(i === puzzle.correctIndex));
        });
        const ans = quiz.querySelector<HTMLElement>('[data-quiz-answer]');
        if (ans) ans.textContent = `It happened in ${puzzle.answerYear}.`;
      } catch { /* keep fallback markup */ }
    }

    let answered = false;
    const reveal = quiz.querySelector<HTMLElement>('[data-quiz-reveal]');
    opts.forEach((opt) => {
      opt.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const correct = opt.getAttribute('data-correct') === 'true';
        opts.forEach((o) => {
          o.disabled = true;
          if (o.getAttribute('data-correct') === 'true') o.classList.add('is-correct');
        });
        if (!correct) opt.classList.add('is-wrong');
        const s = correct ? getStreak(id) + 1 : 0;
        setStreak(id, s);
        if (streakEl) streakEl.textContent = String(s);
        if (reveal) {
          reveal.hidden = false;
          const verdict = reveal.querySelector<HTMLElement>('[data-quiz-verdict]');
          if (verdict) verdict.textContent = correct ? 'Correct!' : 'Not quite — streak reset.';
        }
      });
    });
  });
}

/* ------------------------------------------------------------------ share */
function flash(btn: HTMLElement, msg: string): void {
  const prev = btn.getAttribute('data-label') || btn.textContent || '';
  btn.setAttribute('data-label', prev);
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = btn.getAttribute('data-label'); }, 1600);
}
function wireShare(): void {
  document.querySelectorAll<HTMLElement>('[data-share]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-share-url') || location.href;
      const title = btn.getAttribute('data-share-title') || document.title;
      if (navigator.share) {
        navigator.share({ title, url }).catch(() => { /* dismissed */ });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url)
          .then(() => flash(btn, 'Link copied ✓'))
          .catch(() => flash(btn, url));
      } else {
        flash(btn, `Copy: ${url}`);
      }
    });
  });
}

/* ------------------------------------------------ header quick-date jump */
// Month/day only — day pages are year-agnostic, so the picker is two selects
// instead of a native date input (which forces a year).
const QD_DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // Feb allows 29
function wireQuickDate(): void {
  document.querySelectorAll<HTMLSelectElement>('[data-quick-month]').forEach((monthSel) => {
    const form = monthSel.closest('form');
    const daySel = form?.querySelector<HTMLSelectElement>('[data-quick-day]') ?? null;
    const err = form?.querySelector<HTMLElement>('[data-quick-date-error]') ?? null;
    if (!form || !daySel) return;

    // Keep the day list honest for the chosen month so an invalid combo
    // (April 31, Feb 30) can never be picked — no error state to recover from.
    const capDays = (): void => {
      const m = parseInt(monthSel.value, 10);
      const max = Number.isInteger(m) ? QD_DAYS_IN_MONTH[m - 1] : 31;
      daySel.querySelectorAll<HTMLOptionElement>('option').forEach((opt) => {
        const d = parseInt(opt.value, 10);
        if (Number.isInteger(d)) opt.hidden = opt.disabled = d > max;
      });
      if (parseInt(daySel.value, 10) > max) daySel.value = '';
    };

    const go = (): void => {
      if (!monthSel.value || !daySel.value) return; // not fully chosen yet
      const slug = daySlugFromISO(`2000-${monthSel.value}-${daySel.value}`);
      if (!slug) {
        if (err) err.hidden = false;
        return;
      }
      if (err) err.hidden = true;
      window.location.href = `/${slug}`;
    };

    monthSel.addEventListener('change', () => { capDays(); go(); });
    daySel.addEventListener('change', go);
    form.addEventListener('submit', (e) => { e.preventDefault(); go(); });
    capDays();
  });
}

/* ----------------------------------------- homepage "today" personalization */
function wireToday(): void {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const slug = slugFromParts(month, day);
  const label = `${monthName(month)} ${day}`;
  document.querySelectorAll<HTMLElement>('[data-today-label]').forEach((el) => {
    el.textContent = label;
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-today-link]').forEach((a) => {
    a.href = `/${slug}`;
  });
}

/* ------------------------------------------------------------------- init */
function init(): void {
  wireBirthday();
  wireQuiz();
  wireShare();
  wireQuickDate();
  wireToday();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
