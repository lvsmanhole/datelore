// UTM tagging for outbound social links so referral traffic is attributable in GA4.
// Without consistent UTMs, Pinterest/social inflow collapses into "direct" and you
// can't tell a working channel from a dead one — the single most common way a
// content-distribution bet gets killed for the wrong reason.
//
// Pure + unit-tested. No DOM, no Astro.

export const SITE_ORIGIN = 'https://datelore.com';

export interface UtmParams {
  source: string; // utm_source, e.g. 'pinterest'
  medium: string; // utm_medium, e.g. 'social'
  campaign: string; // utm_campaign, e.g. 'born-on'
  content?: string; // utm_content, e.g. the day slug 'may-31'
}

/**
 * Append UTM params to a site-relative path and return an absolute URL. The path
 * must keep its trailing slash (astro.config `trailingSlash: 'always'`) so the link
 * does not 301-redirect — the query string is appended after the slash.
 * Throws on a path missing its leading slash — fail loud, never silently mislabel.
 */
export function withUtm(path: string, p: UtmParams): string {
  if (!path.startsWith('/')) throw new Error(`withUtm: path must start with '/': "${path}"`);
  const url = new URL(path, SITE_ORIGIN);
  url.searchParams.set('utm_source', p.source);
  url.searchParams.set('utm_medium', p.medium);
  url.searchParams.set('utm_campaign', p.campaign);
  if (p.content) url.searchParams.set('utm_content', p.content);
  return url.toString();
}

export type PinKind = 'born' | 'history';

/** UTM'd destination for a pin: the day page, tagged by pin kind. */
export function pinDestination(daySlug: string, kind: PinKind): string {
  return withUtm(`/${daySlug}/`, {
    source: 'pinterest',
    medium: 'social',
    campaign: kind === 'born' ? 'born-on' : 'on-this-day',
    content: daySlug,
  });
}
