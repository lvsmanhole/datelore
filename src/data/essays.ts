// Marquee editorial store (AdSense spec §5.4). Mirrors src/data/dates.ts: Vite
// inlines the markdown modules at build time — no runtime I/O. Astro compiles
// each .md, exposing `.frontmatter` (typed as EssayMeta) and `.Content`.
import type { MarkdownInstance } from 'astro';
import type { EssayMeta } from '../lib/essays';

const modules = import.meta.glob<MarkdownInstance<EssayMeta>>('./essays/*.md', {
  eager: true,
});

export const ESSAYS: Record<string, MarkdownInstance<EssayMeta>> = {};
for (const path in modules) {
  // "./essays/11-09.md" -> "11-09"
  const key = path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '');
  ESSAYS[key] = modules[path];
}
