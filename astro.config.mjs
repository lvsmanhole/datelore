import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// DateLore — static site. https://datelore.com
// `format: 'directory'` gives clean trailing-slash URLs like /may-31/ which are
// friendlier for SEO + ad crawlers. `trailingSlash: 'always'` documents that the
// canonical form ALWAYS carries the slash, so every internal <a href> must include
// it — otherwise the host 301-redirects /may-31 → /may-31/ on every link (the
// "links to redirect" / "canonical has no incoming links" Ahrefs findings).
// @astrojs/sitemap emits /sitemap-index.xml + /sitemap-0.xml at build time; the
// filter drops /share/, which is noindex and must not appear in the sitemap.
// `serialize` stamps every entry with a <lastmod> of the build time. The whole
// site is statically regenerated and redeployed on each build (OG cards, the
// release window, and the nightly data refresh all bake in), so "last built" is
// an honest freshness signal — without it the sitemap carried no <lastmod> at
// all, which gives Google nothing to prioritise crawling with (a contributor to
// "Discovered – currently not indexed" on a young site).
const BUILD_LASTMOD = new Date().toISOString();

export default defineConfig({
  site: 'https://datelore.com',
  build: { format: 'directory' },
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/share/'),
      serialize(item) {
        item.lastmod = BUILD_LASTMOD;
        return item;
      },
    }),
  ],
});
