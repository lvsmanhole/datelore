import { defineConfig } from 'astro/config';

// DateLore — static site. https://datelore.com
// `format: 'directory'` gives clean trailing-slash URLs like /may-31/ which are
// friendlier for SEO + ad crawlers.
export default defineConfig({
  site: 'https://datelore.com',
  build: { format: 'directory' },
});
