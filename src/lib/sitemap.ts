import { canonicalOf, ROUTES, type Route } from './routes'

/*
 * sitemap.xml for the public pages, written to dist/ by `scripts/prerender.tsx` so it lists exactly the
 * routes that get prerendered. The wrapped view has no URL, so it is never listed. No <lastmod>: the
 * build date would claim every page changed on each deploy, which search engines learn to ignore.
 * The site's robots.txt lives at the domain root (greg0s.github.io), outside this repo, so the sitemap
 * is submitted by hand in Search Console and Bing Webmaster Tools.
 */
export function sitemapXml(): string {
  const urls = (Object.keys(ROUTES) as Route[]).map((route) => `  <url><loc>${canonicalOf(route)}</loc></url>`)
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}
