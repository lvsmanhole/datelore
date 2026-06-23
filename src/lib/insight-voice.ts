import type { InsightData } from './insights';

// Deterministic index from a label, so different dates pick different phrasings
// (variety without Math.random, which must not be used in src/lib).
function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

// Render a year honestly (negative = BC). The deepest-history dates reach into
// antiquity, so "509 BC" must not print as "-509".
function fmtYear(y: number): string {
  return y < 0 ? `${-y} BC` : `${y}`;
}

/**
 * Original, literary analysis of a day, assembled from computed signals. Leads
 * with the single strongest signal — a round anniversary, an unusually deep or
 * shallow historical record (year-span rank vs the whole calendar), or the span
 * itself — then adds an era/theme observation, so the prose VARIES in what it
 * concludes across the 366 days rather than reading as one template. This is the
 * scalable baseline; marquee dates get hand-written essays on top.
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
  } else if (d.historyPercentile != null && d.historyPercentile >= 80 && d.span) {
    parts.push(
      pick(
        [
          `Few dates reach as far back as ${d.dateLabel}: its recorded history runs unusually deep, stretching to ${fmtYear(d.span.earliest)}.`,
          `${d.dateLabel} carries an unusually long memory — its events reach back as far as ${fmtYear(d.span.earliest)}.`,
        ],
        seed,
      ),
    );
  } else if (d.historyPercentile != null && d.historyPercentile <= 20 && d.span) {
    parts.push(
      pick(
        [
          `${d.dateLabel}'s recorded history is unusually compressed, gathered within recent centuries rather than reaching into antiquity.`,
          `As calendar dates go, ${d.dateLabel} keeps a short memory — its record stays close to the present.`,
        ],
        seed,
      ),
    );
  } else if (d.span && d.span.years > 0) {
    parts.push(
      pick(
        [
          `${d.dateLabel}'s record stretches ${d.span.years.toLocaleString('en-US')} years, from ${fmtYear(d.span.earliest)} to ${fmtYear(d.span.latest)}.`,
          `From ${fmtYear(d.span.earliest)} to ${fmtYear(d.span.latest)}, ${d.dateLabel} gathers ${d.span.years.toLocaleString('en-US')} years of history.`,
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

  if (parts.length === 0) {
    parts.push(`${d.dateLabel} keeps a quiet page in the calendar — a date still waiting for its moment in the record.`);
  }

  return parts.join(' ');
}
