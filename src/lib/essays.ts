// Pure helpers for the marquee editorial layer (AdSense spec §5.4). Frontmatter
// parsing + the publish gate live here so the test suite can exercise them in
// plain Node, without Astro's markdown runtime. Rendering uses Astro's native
// .md compilation (see src/data/essays.ts + DayContent.astro).

export interface EssayMeta {
  title: string;
  summary: string;
  author: string;
  reviewedBy: string;
  reviewedOn: string; // YYYY-MM-DD
  reviewed: boolean;
}

export interface ParsedEssay {
  meta: EssayMeta;
  body: string;
}

// Flat `key: value` frontmatter between two `---` fences, then the markdown body.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseEssay(raw: string): ParsedEssay {
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) throw new Error('essay: missing or malformed frontmatter block');
  const [, fm, body] = m;
  const fields: Record<string, string> = {};
  for (const line of fm.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) throw new Error(`essay: malformed frontmatter line: ${line}`);
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }
  return {
    meta: {
      title: fields.title ?? '',
      summary: fields.summary ?? '',
      author: fields.author ?? '',
      reviewedBy: fields.reviewedBy ?? '',
      reviewedOn: fields.reviewedOn ?? '',
      reviewed: fields.reviewed === 'true',
    },
    body: body.trim(),
  };
}

/**
 * The publish gate (spec §6: no auto-publish of generated prose). An essay is
 * publishable only when a human has reviewed it AND its provenance is complete.
 */
export function isPublishable(meta: EssayMeta | null | undefined): boolean {
  return (
    !!meta &&
    meta.reviewed === true &&
    meta.title.length > 0 &&
    meta.author.length > 0 &&
    meta.reviewedBy.length > 0 &&
    meta.reviewedOn.length > 0
  );
}

export function essayWordCount(body: string): number {
  const text = body.trim();
  return text ? text.split(/\s+/).length : 0;
}
