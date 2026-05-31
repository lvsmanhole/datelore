// @ts-check
import { defineConfig } from 'astro/config';

// Static output is Astro's default — pure HTML/CSS/JS ships, no framework
// runtime. `format: 'directory'` gives clean, trailing-slash URLs like
// /day/05-31/ which are friendlier for SEO + ad crawlers.
export default defineConfig({
  site: 'https://datelore.com',
  build: { format: 'directory' },
});
