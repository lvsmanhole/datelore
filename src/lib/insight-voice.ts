import type { InsightData } from './insights';

// Deterministic index from a label, so different dates pick different phrasings
// (variety without Math.random, which must not be used in src/lib).
function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

/**
 * Original, literary analysis of a day, assembled from computed signals. Leads
 * with the single strongest signal — a round anniversary, unusual density, or
 * unusual quiet — then adds an era/theme observation, so the prose VARIES in
 * what it concludes across the 366 days rather than reading as one template.
 * This is the scalable baseline; marquee dates get hand-written essays on top.
 */
export function insightProse(d: InsightData): string {
  const parts: string[] = [];
  const seed = d.dateLabel;

  if (d.topAnniversary) {
    const a = d.topAnniversary;
    parts.push(
      pick(
        [
          `This year marks the ${a.yearsAgo}th anniversary of ${a.title} — ${d.dateLabel} carries the weight of round numbers.`,
          `${a.yearsAgo} years on from ${a.title}, ${d.dateLabel} is a date with an anniversary worth pausing on.`,
        ],
        seed,
      ),
    );
  } else if (d.eventPercentile != null && d.eventPercentile >= 80) {
    parts.push(
      pick(
        [
          `Few squares on the calendar are as crowded as ${d.dateLabel}: it sits among the busiest dates of the year for recorded history.`,
          `${d.dateLabel} is one of the year's heavier dates — history kept unusually busy here.`,
        ],
        seed,
      ),
    );
  } else if (d.eventPercentile != null && d.eventPercentile <= 20) {
    parts.push(
      pick(
        [
          `${d.dateLabel} is one of the calendar's quieter dates — history seems to have largely passed it by.`,
          `As calendar dates go, ${d.dateLabel} keeps a light record; not every day is a crossroads.`,
        ],
        seed,
      ),
    );
  } else if (d.span && d.span.years > 0) {
    parts.push(
      pick(
        [
          `${d.dateLabel}'s record stretches ${d.span.years.toLocaleString('en-US')} years, from ${d.span.earliest} to ${d.span.latest}.`,
          `From ${d.span.earliest} to ${d.span.latest}, ${d.dateLabel} gathers ${d.span.years.toLocaleString('en-US')} years of history.`,
        ],
        seed,
      ),
    );
  }

  if (d.dominantEra && d.theme) {
    parts.push(
      pick(
        [
          `Its center of gravity is the ${d.dominantEra}, and ${d.theme}.`,
          `Most of the weight falls in the ${d.dominantEra}, where ${d.theme}.`,
        ],
        seed + 'x',
      ),
    );
  } else if (d.dominantEra) {
    parts.push(`Its center of gravity is the ${d.dominantEra}.`);
  } else if (d.theme) {
    parts.push(`Across its entries, ${d.theme}.`);
  }

  return parts.join(' ');
}
