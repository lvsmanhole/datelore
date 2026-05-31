import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// DateLore — static site. https://datelore.com
// `format: 'directory'` gives clean trailing-slash URLs like /may-31/ which are
// friendlier for SEO + ad crawlers. @astrojs/sitemap emits /sitemap-index.xml +
// /sitemap-0.xml at build time, covering every built page (home, the 366 day
// pages, and the tool pages). Requires `site` to be set (above).
export default defineConfig({
  site: 'https://datelore.com',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
