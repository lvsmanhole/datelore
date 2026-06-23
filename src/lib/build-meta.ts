// Build timestamp, evaluated once per build. The whole static site is regenerated
// and redeployed on every build (data refresh, OG cards, release window all rebake),
// so this is an honest "last regenerated" signal — not an invented date. It mirrors
// the sitemap's <lastmod>, which is also stamped at build time (see astro.config.mjs).
export const BUILD_ISO: string = new Date().toISOString();
