import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEssay, isPublishable, essayWordCount } from '../lib/essays';

const DIR = join(process.cwd(), 'src/data/essays');
const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.md')) : [];

describe('marquee essays integrity (src/data/essays/*.md)', () => {
  it('every essay filename is a valid MM-DD.md', () => {
    for (const f of files) {
      expect(f).toMatch(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\.md$/);
    }
  });

  for (const f of files) {
    it(`${f}: frontmatter is well-formed; published essays carry depth + provenance`, () => {
      const { meta, body } = parseEssay(readFileSync(join(DIR, f), 'utf8'));
      expect(meta.title).not.toBe('');
      expect(meta.summary).not.toBe('');
      expect(meta.author).not.toBe('');
      if (meta.reviewed) {
        expect(isPublishable(meta)).toBe(true);
        expect(meta.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(essayWordCount(body)).toBeGreaterThanOrEqual(400);
      }
    });
  }
});
