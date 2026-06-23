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
