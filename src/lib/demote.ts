// Pull the person's name out of a baked death entry's HTML (`<b>Name</b>, descriptor`),
// so the day page can show the FACT (who died) without the copied Wikipedia descriptor.
// Pure + unit-tested.
export function boldName(html: string): string {
  const m = html.match(/<b>([\s\S]*?)<\/b>/i);
  const raw = m ? m[1] : html;
  return raw
    .replace(/<[^>]*>/g, '') // strip any stray tags
    .replace(/&amp;/g, '&')  // decode the one entity the dataset uses for names
    .trim();
}

// True when a "name" is really just a year placeholder (e.g. "AD 404", "12"),
// which the source data uses when no actual name was recorded. After demotion such
// rows would render as a meaningless "404 — AD 404", so callers skip them.
export function isYearName(name: string): boolean {
  return /^(AD\s+)?\d{1,4}$/i.test(name.trim());
}
